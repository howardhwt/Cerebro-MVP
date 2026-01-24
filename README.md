# Cerebro Dashboard

A Sales Intelligence OS built with Next.js 14, Tailwind CSS, and Perplexity AI.

## Features

- **Analysis Page**: Upload files or paste text to extract customer pain points using AI
- **Product Vault**: Manage product features and capabilities (coming soon)
- **Radar**: Monitor customer needs and opportunities (coming soon)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Add your Perplexity API key to `.env`:
```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```
Get your API key from [Perplexity Settings](https://www.perplexity.ai/settings/api)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### The Insight Engine (Pillar 1: Listen)

The `/api/analyze` route uses Perplexity AI to extract structured customer needs from transcripts:

- **Pain Point**: The specific problem or need mentioned
- **Urgency**: A score from 1-5 (1 = very low, 5 = critical)
- **Mentioned Timeline**: Any timeline mentioned (e.g., "Q3", "next quarter", "in 6 months")

Simply paste a transcript or upload a text file, and the AI will automatically extract and display customer pain points as cards.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **AI Engine**: Perplexity API (llama-3.1-sonar-small-128k-online)
- **Database**: Supabase (configured, ready for future use)
- **Icons**: Lucide React
- **Hosting**: Vercel-ready

## Project Structure

```
/app
  /api
    /analyze          # Perplexity AI-powered analysis endpoint (returns JSON only)
    /analyze-and-save # Analyzes transcript and saves to Supabase database
  /page.tsx           # Analysis page (main)
  /product-vault      # Product Vault page
  /radar              # Radar page
/components
  Sidebar.tsx         # Navigation sidebar
  PainPointCard.tsx   # Pain point display component
/lib
  analyze-transcript.ts # Core function to analyze and save insights
  supabase.ts          # Supabase client configuration
```

## Database Integration

### Analyze and Save Function

The `analyzeTranscriptAndSave` function processes transcripts and automatically saves insights to your Supabase database:

```typescript
import { analyzeTranscriptAndSave } from "@/lib/analyze-transcript";

const insights = await analyzeTranscriptAndSave(transcript, callId);
```

Or use the API route:

```bash
POST /api/analyze-and-save
{
  "transcript": "Customer call transcript...",
  "call_id": "uuid-from-calls-table"
}
```

See `/lib/README.md` for detailed usage and database schema requirements.
