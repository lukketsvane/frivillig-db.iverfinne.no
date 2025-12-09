#!/usr/bin/env python3
"""
Qdrant Data Ingestion Script

This script reads organization data from JSON files and upserts them
to a Qdrant vector database with embeddings from Google's text-embedding-004 model.

Usage:
    python scripts/ingest_qdrant.py

Environment Variables:
    GOOGLE_API_KEY: Google AI API key for generating embeddings
    QDRANT_URL: Qdrant Cloud URL (optional, defaults to localhost)
    QDRANT_API_KEY: Qdrant Cloud API key (optional, not needed for localhost)

Requirements:
    pip install google-generativeai qdrant-client python-dotenv
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

# Load environment variables from .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, rely on system env vars

try:
    import google.generativeai as genai
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance,
        PointStruct,
        VectorParams,
    )
except ImportError as e:
    print(f"Missing required packages. Install with: pip install google-generativeai qdrant-client python-dotenv")
    print(f"Error: {e}")
    sys.exit(1)

# Configuration
# Support Qdrant Cloud via QDRANT_URL and QDRANT_API_KEY, fallback to localhost
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "frivillig_orgs"
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMENSION = 768  # Dimension for text-embedding-004
BATCH_SIZE = 100  # Number of points to upsert at a time


def get_qdrant_client() -> QdrantClient:
    """
    Create Qdrant client with support for both cloud and local instances.
    - If QDRANT_URL is set, connect to Qdrant Cloud with API key
    - Otherwise, fallback to localhost:6333
    """
    if QDRANT_URL:
        print("Connecting to Qdrant Cloud...")
        return QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
    else:
        print("Connecting to local Qdrant at localhost:6333")
        return QdrantClient(host="localhost", port=6333)


def get_google_api_key() -> str:
    """Get Google API key from environment."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set")
        sys.exit(1)
    return api_key


def create_embedding_text(org: dict[str, Any]) -> str:
    """
    Create a rich context string for embedding.
    Format: "Organisasjon: {navn}. Hovedaktivitet: {aktivitet}. Formål: {vedtektsfestet_formaal}. Kategori: {naeringskode_beskrivelse}"
    """
    parts = []
    
    navn = org.get("navn")
    if navn:
        parts.append(f"Organisasjon: {navn}")
    
    aktivitet = org.get("aktivitet")
    if aktivitet:
        parts.append(f"Hovedaktivitet: {aktivitet}")
    
    formaal = org.get("vedtektsfestet_formaal")
    if formaal:
        parts.append(f"Formål: {formaal}")
    
    # Include naeringskode descriptions for richer categorization
    naeringskoder = []
    if org.get("naeringskode1_beskrivelse"):
        naeringskoder.append(str(org["naeringskode1_beskrivelse"]))
    if org.get("naeringskode2_beskrivelse"):
        naeringskoder.append(str(org["naeringskode2_beskrivelse"]))
    if org.get("naeringskode3_beskrivelse"):
        naeringskoder.append(str(org["naeringskode3_beskrivelse"]))
    
    if naeringskoder:
        parts.append(f"Kategori: {', '.join(naeringskoder)}")
    
    return ". ".join(parts) if parts else ""


def get_embedding(text: str) -> list[float]:
    """Generate embedding for text using Google's text-embedding-004 model."""
    if not text.strip():
        # Return zero vector for empty text
        return [0.0] * EMBEDDING_DIMENSION
    
    # Truncate text if too long (model has a limit)
    max_chars = 8000
    if len(text) > max_chars:
        text = text[:max_chars]
    
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in batch."""
    embeddings = []
    for text in texts:
        embedding = get_embedding(text)
        embeddings.append(embedding)
    return embeddings


def load_json_files(json_store_path: Path) -> list[dict[str, Any]]:
    """Load all organization JSON files from the json-store directory."""
    organizations = []
    
    json_files = sorted(json_store_path.glob("organizations_part_*.json"))
    
    if not json_files:
        print(f"No JSON files found in {json_store_path}")
        sys.exit(1)
    
    for json_file in json_files:
        print(f"Loading {json_file.name}...")
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            organizations.extend(data)
    
    return organizations


def setup_qdrant_collection(client: QdrantClient) -> None:
    """Create or recreate the Qdrant collection."""
    # Check if collection exists
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]
    
    if COLLECTION_NAME in collection_names:
        print(f"Collection '{COLLECTION_NAME}' exists. Recreating...")
        client.delete_collection(COLLECTION_NAME)
    
    # Create collection with vector configuration
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=EMBEDDING_DIMENSION,
            distance=Distance.COSINE,
        ),
    )
    print(f"Created collection '{COLLECTION_NAME}' with {EMBEDDING_DIMENSION}-dimensional vectors")


def extract_fylke_from_kommune(kommune: str | None) -> str | None:
    """
    Extract fylke (county) from kommune name if available.
    This is a simplified mapping - in production, use a proper lookup table.
    """
    if not kommune:
        return None
    
    # Norwegian fylke mappings (simplified)
    fylke_mapping = {
        "OSLO": "Oslo",
        "BERGEN": "Vestland",
        "TRONDHEIM": "Trøndelag",
        "STAVANGER": "Rogaland",
        "KRISTIANSAND": "Agder",
        "FREDRIKSTAD": "Viken",
        "TROMSØ": "Troms og Finnmark",
        "DRAMMEN": "Viken",
        "SANDNES": "Rogaland",
        "LILLEHAMMER": "Innlandet",
        "ÅLESUND": "Møre og Romsdal",
        "MOLDE": "Møre og Romsdal",
        "HAUGESUND": "Rogaland",
        "SANDEFJORD": "Vestfold og Telemark",
        "BODØ": "Nordland",
        "TØNSBERG": "Vestfold og Telemark",
        "SARPSBORG": "Viken",
        "ARENDAL": "Agder",
        "SKIEN": "Vestfold og Telemark",
        "HALDEN": "Viken",
    }
    
    kommune_upper = kommune.upper()
    return fylke_mapping.get(kommune_upper)


def create_point(org: dict[str, Any], embedding: list[float], point_id: int) -> PointStruct:
    """Create a Qdrant point from organization data."""
    # Extract kommune from address
    kommune = org.get("forretningsadresse_kommune")
    
    # Try to determine fylke
    fylke = extract_fylke_from_kommune(kommune)
    
    # Build a description for UI display (combine aktivitet as primary description)
    beskrivelse = org.get("aktivitet", "") or org.get("vedtektsfestet_formaal", "")
    
    payload = {
        "id": org.get("id", ""),
        "navn": org.get("navn", ""),
        "kommune": kommune or "",
        "fylke": fylke or "",
        # UI-relevant fields so we don't need a second database lookup
        "beskrivelse": beskrivelse,
        "aktivitet": org.get("aktivitet", ""),
        "vedtektsfestet_formaal": org.get("vedtektsfestet_formaal", ""),
        "poststed": org.get("forretningsadresse_poststed", ""),
        "postnummer": str(org.get("forretningsadresse_postnummer", "") or ""),
        "hjemmeside": org.get("hjemmeside", ""),
        "telefon": org.get("telefon", ""),
        "epost": org.get("epost", ""),
        "organisasjonsform": org.get("organisasjonsform_beskrivelse", ""),
        "naeringskode": org.get("naeringskode1_beskrivelse", ""),
    }
    
    return PointStruct(
        id=point_id,
        vector=embedding,
        payload=payload,
    )


def main():
    """Main ingestion function."""
    print("=" * 60)
    print("Qdrant Data Ingestion Script")
    print("=" * 60)
    
    # Setup Google AI
    api_key = get_google_api_key()
    genai.configure(api_key=api_key)
    print("✓ Google AI configured")
    
    # Setup Qdrant client (supports both cloud and local)
    client = get_qdrant_client()
    print("✓ Connected to Qdrant")
    
    # Setup collection
    setup_qdrant_collection(client)
    
    # Load JSON files
    script_dir = Path(__file__).parent.parent
    json_store_path = script_dir / "public" / "json-store"
    
    print(f"\nLoading organizations from {json_store_path}...")
    organizations = load_json_files(json_store_path)
    print(f"✓ Loaded {len(organizations)} organizations")
    
    # Filter organizations with valid data for embedding
    valid_orgs = []
    for org in organizations:
        embedding_text = create_embedding_text(org)
        if embedding_text.strip() and org.get("id"):
            valid_orgs.append((org, embedding_text))
    
    print(f"✓ {len(valid_orgs)} organizations have valid data for embedding")
    
    # Process in batches
    total_points = 0
    batch_num = 0
    
    print(f"\nProcessing {len(valid_orgs)} organizations in batches of {BATCH_SIZE}...")
    
    for i in range(0, len(valid_orgs), BATCH_SIZE):
        batch = valid_orgs[i:i + BATCH_SIZE]
        batch_num += 1
        
        print(f"\nBatch {batch_num}: Processing {len(batch)} organizations...")
        
        # Generate embeddings for batch
        texts = [item[1] for item in batch]
        embeddings = get_embeddings_batch(texts)
        
        # Create points
        points = []
        for j, ((org, _), embedding) in enumerate(zip(batch, embeddings)):
            point_id = i + j
            point = create_point(org, embedding, point_id)
            points.append(point)
        
        # Upsert batch
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )
        
        total_points += len(points)
        print(f"✓ Batch {batch_num} complete. Total points: {total_points}/{len(valid_orgs)}")
    
    print("\n" + "=" * 60)
    print(f"Ingestion complete!")
    print(f"Total organizations processed: {total_points}")
    print(f"Collection: {COLLECTION_NAME}")
    print("=" * 60)


if __name__ == "__main__":
    main()
