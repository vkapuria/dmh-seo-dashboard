# DMH SEO Dashboard

A custom SEO analytics dashboard for DoMyHomework.co, built with Next.js 16.1 and Google Search Console API.

## Features

- **Real-time Metrics**: Track clicks, impressions, CTR, and average position
- **Keyword Rankings**: Monitor keyword performance with position change tracking
- **Page Performance**: Analyze performance by page type (Blog, Tool, Service, Static)
- **Smart Alerts**: Automatic alerts for position drops, traffic spikes, and new rankings
- **Historical Data**: Up to 16 months of backfilled data from GSC
- **Daily Sync**: Automated daily data synchronization

## Tech Stack

- **Framework**: Next.js 16.1 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **API**: Google Search Console API

## Setup Instructions

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Search Console API**:
   - Navigate to APIs & Services → Library
   - Search for "Google Search Console API"
   - Click Enable

4. Create a Service Account:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Name it (e.g., "dmh-seo-dashboard")
   - Click Create and Continue
   - Skip granting access (not needed)
   - Click Done

5. Create a Key for the Service Account:
   - Click on the service account you created
   - Go to "Keys" tab
   - Add Key → Create new key → JSON
   - Download and save the JSON file securely

6. Add Service Account to GSC:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Select your property (domyhomework.co)
   - Settings → Users and permissions → Add user
   - Enter the service account email (from the JSON file)
   - Permission: "Full" or "Restricted"

### 2. Supabase Setup

1. Go to your existing Supabase project
2. Open SQL Editor
3. Copy and run the contents of `supabase/migrations/001_create_tables.sql`

### 3. Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Fill in the values:

```env
# Supabase (from your existing project)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Search Console (from JSON key file)
GSC_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GSC_PROJECT_ID=your-google-cloud-project-id

# Site URL (domain property format)
GSC_SITE_URL=sc-domain:domyhomework.co
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Initial Data Sync

1. Go to the Settings tab
2. Click "Backfill Historical Data" to fetch up to 16 months of data
3. Wait for completion (may take several minutes)

## Deployment to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
dmh-seo-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/route.ts      # Sync GSC data
│   │   │   ├── metrics/route.ts   # Dashboard metrics
│   │   │   ├── keywords/route.ts  # Keyword rankings
│   │   │   ├── pages/route.ts     # Page performance
│   │   │   └── alerts/route.ts    # Alerts management
│   │   ├── page.tsx               # Main dashboard
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── metric-card.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   ├── keywords-table.tsx
│   │   │   ├── pages-table.tsx
│   │   │   └── alerts-list.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── card.tsx
│   ├── lib/
│   │   ├── gsc.ts                 # GSC API client
│   │   ├── supabase.ts            # Supabase client
│   │   ├── sync.ts                # Data sync logic
│   │   └── utils.ts               # Helpers
│   └── types/
│       └── database.ts            # TypeScript types
└── supabase/
    └── migrations/
        └── 001_create_tables.sql  # Database schema
```

## License

Private - DoMyHomework.co
