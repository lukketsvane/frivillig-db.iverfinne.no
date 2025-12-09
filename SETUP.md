# Setup Guide

This guide will help you set up the Frivillig-DB application with Supabase and Google OAuth.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available at [supabase.com](https://supabase.com))
- A Google Cloud Platform account (for OAuth setup)
- pnpm installed (`npm install -g pnpm`)

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Project Name: `frivillig-db`
   - Database Password: (choose a strong password)
   - Region: (choose the closest to your users)
4. Wait for the project to be created

### Get Your API Keys

1. In your Supabase project dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Create Environment Variables

1. Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

### Configure Database Tables

The application expects the following tables in Supabase:

#### Organizations Table
```sql
create table organisasjonar (
  id uuid default gen_random_uuid() primary key,
  navn text,
  aktivitet text,
  vedtektsfestet_formaal text,
  forretningsadresse_poststed text,
  forretningsadresse_kommune text,
  forretningsadresse_postnummer text,
  forretningsadresse_adresse text,
  naeringskode1_beskrivelse text,
  naeringskode2_beskrivelse text,
  organisasjonsform_beskrivelse text,
  hjemmeside text,
  epost text,
  telefon text,
  registrert_i_frivillighetsregisteret boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### Favorites Table
```sql
create table favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  organization_id uuid references organisasjonar not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, organization_id)
);
```

#### Bookmarks Table
```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  organization_id uuid references organisasjonar not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, organization_id)
);
```

#### Chat History Table
```sql
create table chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  message text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## 2. Google OAuth Setup

### Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://your-domain.com/auth/callback`
   - **Important:** Also add your Supabase callback URL: `https://your-project.supabase.co/auth/v1/callback`

### Configure Supabase OAuth

1. In your Supabase project, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
4. Save the configuration

## 3. Create Initial User

To create the initial user (iverfinne@gmail.com) with the specified password:

### Option 1: Using Supabase Dashboard

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Add user" > "Create new user"
3. Fill in:
   - Email: `iverfinne@gmail.com`
   - Password: `S2Gjs9vj`
   - Auto Confirm User: ✓ (check this to skip email confirmation)
4. Click "Create user"

### Option 2: Using the Application

1. Start the development server: `npm run dev`
2. Go to `/signup`
3. Fill in the form:
   - Email: `iverfinne@gmail.com`
   - Password: `S2Gjs9vj`
   - Confirm Password: `S2Gjs9vj`
4. Click "Opprett konto"
5. If email confirmation is enabled, check your email and confirm
6. Alternatively, you can confirm the user in the Supabase dashboard under Authentication > Users

### Option 3: Using Supabase SQL Editor

1. Go to SQL Editor in your Supabase dashboard
2. Run the following SQL (the password will be hashed automatically):

```sql
-- Create a user via SQL
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'iverfinne@gmail.com',
  crypt('S2Gjs9vj', gen_salt('bf')),
  now(),
  now(),
  now(),
  now()
);
```

**Note:** This requires the `pgcrypto` extension to be enabled. You can enable it by running:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## 4. Install and Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 5. Verify Setup

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click the login button and try logging in with `iverfinne@gmail.com` / `S2Gjs9vj`
3. Test the Google OAuth button
4. Navigate to `/slikkepinne` to test the request creation feature
5. Navigate to `/om-tenesta` to view the service information

## Troubleshooting

### Google OAuth Not Working

- Verify that your redirect URIs are correctly configured in Google Cloud Console
- Make sure you've added the Supabase callback URL
- Check that the Google provider is enabled in Supabase

### Database Connection Issues

- Verify your Supabase URL and anon key are correct
- Check that your Supabase project is active
- Ensure the database tables are created

### User Creation Issues

- If using email/password signup, check your email for confirmation
- You can manually confirm users in the Supabase dashboard
- Verify that email confirmation is disabled if you want instant access

## Production Deployment

When deploying to production (e.g., Vercel):

1. Add environment variables to your hosting platform
2. Update Google OAuth redirect URIs to include your production domain
3. Ensure your Supabase project is configured for production use
4. Consider enabling Row Level Security (RLS) policies for your tables

## Security Notes

- Never commit `.env.local` or any file containing secrets
- Use strong passwords in production
- Enable Row Level Security (RLS) in Supabase for production
- Regularly rotate your API keys
- Use the principle of least privilege for database access
