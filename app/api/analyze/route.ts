import { NextRequest, NextResponse } from "next/server";
import { extractValidJson } from "@/lib/extract-json";

interface CustomerNeed {
  painPoint: string;
  urgency: number; // 1-5
  mentionedTimeline?: string; // e.g., "Q3", "September", "in 6 months"
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: "Perplexity API key is not configured" },
        { status: 500 }
      );
    }

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

Return ONLY a JSON object with a "needs" array. Example format:
{
  "needs": [
    {
      "painPoint": "SOC2 compliance",
      "urgency": 4,
      "mentionedTimeline": "Before Q3"
    },
    {
      "painPoint": "Data migration challenges",
      "urgency": 3,
      "mentionedTimeline": "Next quarter"
    }
  ]
}`;

    // Call Perplexity API
    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
      return NextResponse.json(
        { error: `Perplexity API error: ${perplexityResponse.statusText}` },
        { status: perplexityResponse.status }
      );
    }

    const completion = await perplexityResponse.json();

    // Extract valid JSON (handles both regular and reasoning models)
    let parsedResponse;
    try {
      parsedResponse = extractValidJson(completion);
    } catch (parseError) {
      console.error("Failed to parse Perplexity response:", completion);
      return NextResponse.json(
        {
          error: "Invalid JSON response from Perplexity API",
          details: parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Handle both { "needs": [...] } and direct array responses
    const customerNeeds: CustomerNeed[] = Array.isArray(parsedResponse)
      ? parsedResponse
      : parsedResponse.needs || parsedResponse.customerNeeds || [];

    // Validate and clean the data
    const validatedNeeds = customerNeeds
      .filter((need) => need.painPoint && need.urgency)
      .map((need, index) => ({
        id: `need-${index}-${Date.now()}`,
        painPoint: need.painPoint.trim(),
        urgency: Math.max(1, Math.min(5, Math.round(need.urgency))), // Clamp between 1-5
        mentionedTimeline: need.mentionedTimeline?.trim() || undefined,
      }));

    return NextResponse.json({ customerNeeds: validatedNeeds });
  } catch (error) {
    console.error("Error analyzing transcript:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze transcript",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
