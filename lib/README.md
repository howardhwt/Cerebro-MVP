# Analyze Transcript Function

## Overview

The `analyzeTranscriptAndSave` function processes a call transcript using Perplexity AI and automatically saves the extracted insights to the `extracted_insights` table in Supabase.

## Usage

### As a Direct Function Call

```typescript
import { analyzeTranscriptAndSave } from "@/lib/analyze-transcript";

// Example: Analyze a transcript and save insights
const transcript = "Customer mentioned they need SOC2 compliance before Q3...";
const callId = "123e4567-e89b-12d3-a456-426614174000"; // UUID from calls table

try {
  const insights = await analyzeTranscriptAndSave(transcript, callId);
  console.log(`Saved ${insights.length} insights`);
} catch (error) {
  console.error("Error:", error);
}
```

### As an API Route

```typescript
// POST /api/analyze-and-save
const response = await fetch("/api/analyze-and-save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    transcript: "Customer transcript text...",
    call_id: "123e4567-e89b-12d3-a456-426614174000",
  }),
});

const data = await response.json();
// Returns: { success: true, insights: [...], count: number }
```

## Database Schema

The function expects the following table structure:

### `extracted_insights` table

```sql
CREATE TABLE extracted_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id),
  pain_point_description TEXT NOT NULL,
  raw_quote TEXT,
  urgency_level INTEGER NOT NULL CHECK (urgency_level >= 1 AND urgency_level <= 5),
  mentioned_timeline TEXT,
  follow_up_date TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `calls` table (referenced)

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript TEXT,
  -- other fields...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Function Parameters

- `transcript` (string, required): The call transcript text to analyze
- `callId` (string, required): The UUID of the call record in the `calls` table

## Return Value

Returns an array of `ExtractedInsight` objects that were saved to the database:

```typescript
interface ExtractedInsight {
  id: string;
  call_id: string;
  pain_point_description: string;
  raw_quote?: string;
  urgency_level: number; // 1-5
  mentioned_timeline?: string;
  follow_up_date?: string; // Calculated from mentioned_timeline
  status?: string; // Defaults to "new"
  created_at: string;
}
```

## Features

- **Raw Quote Extraction**: Automatically extracts the exact quote from the transcript where the pain point was mentioned
- **Follow-up Date Calculation**: Automatically calculates `follow_up_date` from `mentioned_timeline` (supports Q1-Q4, "next quarter", "next month", "in X months")
- **Default Status**: Sets status to "new" by default for all extracted insights

## Error Handling

The function throws errors for:
- Missing or invalid transcript
- Missing or invalid call_id
- Missing Perplexity API key
- Perplexity API errors
- Database insertion errors

Make sure to wrap calls in try-catch blocks.
