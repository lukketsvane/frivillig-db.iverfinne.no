export interface GeocodingResult {
  poststed?: string
  kommune?: string
  fylke?: string
  postnummer?: string
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=no`,
      {
        headers: {
          "User-Agent": "Frivillig-utforskar/1.0",
        },
      },
    )

    if (!response.ok) {
      console.error("[v0] Geocoding failed:", response.statusText)
      return null
    }

    const data = await response.json()

    if (!data.address) {
      return null
    }

    const { address } = data

    return {
      poststed: address.city || address.town || address.village || address.municipality,
      kommune: address.municipality || address.county,
      fylke: address.state || address.county,
      postnummer: address.postcode,
    }
  } catch (error) {
    console.error("[v0] Error reverse geocoding:", error)
    return null
  }
}
