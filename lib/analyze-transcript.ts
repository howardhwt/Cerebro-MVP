import { supabaseAdmin } from "./supabase";
import { extractValidJson } from "./extract-json";

export interface CustomerNeed {
  painPoint: string;
  urgency: number; // 1-5
  mentionedTimeline?: string;
  rawQuote?: string; // The actual quote from the transcript
}

export interface ExtractedInsight {
  id?: string;
  call_id: string;
  pain_point_description: string;
  raw_quote?: string | null;
  urgency_level: number;
  mentioned_timeline?: string | null;
  follow_up_date?: string | null;
  status?: string;
  created_at?: string;
}

/**
 * Analyzes a transcript using Perplexity AI and saves extracted insights to the database
 * @param transcript - The call transcript text
 * @param callId - The ID of the call record in the calls table
 * @returns Array of extracted insights that were saved to the database
 */
export async function analyzeTranscriptAndSave(
  transcript: string,
  callId: string
): Promise<ExtractedInsight[]> {
  if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
    throw new Error("Transcript is required and must be a non-empty string");
  }

  if (!callId || typeof callId !== "string") {
    throw new Error("Call ID is required");
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key is not configured");
  }

  // Step 1: Call Perplexity API to extract insights
  const systemPrompt = `You are an expert at analyzing sales call transcripts and extracting customer needs. Extract customer needs from the transcript provided.

IMPORTANT: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return only the JSON object.

For each customer need, identify:
1. Pain Point: The specific problem, challenge, or need mentioned by the customer
2. Urgency: A number from 1-5 where:
   - 1 = Very low urgency (mentioned casually, no timeline)
   - 2 = Low urgency (mentioned but not pressing)
   - 3 = Medium urgency (some timeline mentioned)
   - 4 = High urgency (specific deadline or blocking issue)
   - 5 = Critical urgency (urgent, ASAP, blocking, critical)
3. Mentioned Timeline: Extract any timeline mentioned (e.g., "Q3 2024", "September", "next quarter", "in 6 months", "before Q3", "by end of year"). If no timeline is mentioned, omit this field.
4. Raw Quote: Extract the exact quote or sentence from the transcript where this pain point was mentioned. Include enough context to understand the statement (1-3 sentences). If you cannot find a specific quote, omit this field.

Return ONLY a JSON object with a "needs" array. Example format:
{
  "needs": [
    {
      "painPoint": "SOC2 compliance",
      "urgency": 4,
      "mentionedTimeline": "Before Q3",
      "rawQuote": "honestly right now we are struggling with SOC2 compliance. We need to solve that before Q3."
    },
    {
      "painPoint": "Data migration challenges",
      "urgency": 3,
      "mentionedTimeline": "Next quarter",
      "rawQuote": "We're having issues with our data migration and we'll need to address this next quarter."
    }
  ]
}`;

  const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
      body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar", // Default to cheapest model (sonar), can override via env
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
      // Note: Perplexity doesn't support response_format like OpenAI
      // We rely on the prompt to get JSON and parse it with extractValidJson
    }),
  });

  if (!perplexityResponse.ok) {
    const errorData = await perplexityResponse.text();
    console.error("Perplexity API error:", errorData);
    throw new Error(`Perplexity API error: ${perplexityResponse.statusText}`);
  }

  const completion = await perplexityResponse.json();

  // Extract valid JSON (handles both regular and reasoning models)
  let parsedResponse;
  try {
    parsedResponse = extractValidJson(completion);
  } catch (parseError) {
    console.error("Failed to parse Perplexity response:", completion);
    throw new Error(
      `Invalid JSON response from Perplexity API: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
    );
  }

  // Handle both { "needs": [...] } and direct array responses
  const customerNeeds: CustomerNeed[] = Array.isArray(parsedResponse)
    ? parsedResponse
    : parsedResponse.needs || parsedResponse.customerNeeds || [];

  // Validate and clean the data
  const validatedNeeds = customerNeeds
    .filter((need) => need.painPoint && need.urgency)
    .map((need) => ({
      painPoint: need.painPoint.trim(),
      urgency: Math.max(1, Math.min(5, Math.round(need.urgency))), // Clamp between 1-5
      mentionedTimeline: need.mentionedTimeline?.trim() || undefined,
      rawQuote: need.rawQuote?.trim() || undefined,
    }));

  if (validatedNeeds.length === 0) {
    console.warn("No valid insights extracted from transcript");
    return [];
  }

  // Helper function to calculate follow-up date from mentioned timeline
  const calculateFollowUpDate = (timeline?: string): string | null => {
    if (!timeline) return null;

    const now = new Date();
    const lowerTimeline = timeline.toLowerCase();

    // Handle quarter references
    if (lowerTimeline.includes("q1")) {
      const year = now.getFullYear() + (now.getMonth() < 3 ? 0 : 1);
      return new Date(year, 0, 1).toISOString(); // January 1st
    }
    if (lowerTimeline.includes("q2")) {
      const year = now.getFullYear() + (now.getMonth() < 6 ? 0 : 1);
      return new Date(year, 3, 1).toISOString(); // April 1st
    }
    if (lowerTimeline.includes("q3")) {
      const year = now.getFullYear() + (now.getMonth() < 9 ? 0 : 1);
      return new Date(year, 6, 1).toISOString(); // July 1st
    }
    if (lowerTimeline.includes("q4")) {
      const year = now.getFullYear() + (now.getMonth() < 12 ? 0 : 1);
      return new Date(year, 9, 1).toISOString(); // October 1st
    }

    // Handle "next quarter"
    if (lowerTimeline.includes("next quarter")) {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarter = (currentQuarter + 1) % 4;
      const year = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
      const month = nextQuarter * 3;
      return new Date(year, month, 1).toISOString();
    }

    // Handle "next month"
    if (lowerTimeline.includes("next month")) {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    // Handle "in X months"
    const monthsMatch = lowerTimeline.match(/in (\d+)\s*months?/);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      return new Date(now.getFullYear(), now.getMonth() + months, 1).toISOString();
    }

    // If we can't parse it, return null
    return null;
  };

  // Step 2: Save insights to the extracted_insights table
  const insightsToInsert: Omit<ExtractedInsight, "id" | "created_at">[] = validatedNeeds.map(
    (need) => ({
      call_id: callId,
      pain_point_description: need.painPoint,
      raw_quote: need.rawQuote || null,
      urgency_level: need.urgency,
      mentioned_timeline: need.mentionedTimeline || null,
      follow_up_date: calculateFollowUpDate(need.mentionedTimeline),
      status: "new", // Default status
    })
  );

  const { data: insertedInsights, error: insertError } = await supabaseAdmin
    .from("extracted_insights")
    .insert(insightsToInsert)
    .select();

  if (insertError) {
    console.error("Error inserting insights into database:", insertError);
    throw new Error(`Failed to save insights to database: ${insertError.message}`);
  }

  return insertedInsights || [];
}
