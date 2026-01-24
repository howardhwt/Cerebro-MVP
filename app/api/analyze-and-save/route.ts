import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractValidJson } from "@/lib/extract-json";

/**
 * API route that:
 * 1. Analyzes transcript using Perplexity (extracts pain points AND organization name)
 * 2. Creates/finds organization in organizations table
 * 3. Saves transcript to calls table with org_id
 * 4. Saves extracted insights to extracted_insights table
 * Expects: { transcript: string }
 */
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

    // Step 1: Call Perplexity API to extract insights AND organization name
    const systemPrompt = `You are an expert at analyzing sales call transcripts and extracting customer needs and organization information.

IMPORTANT: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return only the JSON object.

Extract the following from the transcript:
1. Organization Name: The name of the customer/client company that the sales rep is talking to. This should be the official company name.
2. Customer Needs: For each customer need, identify:
   - Pain Point: The specific problem, challenge, or need mentioned by the customer
   - Urgency: A number from 1-5 where:
     - 1 = Very low urgency (mentioned casually, no timeline)
     - 2 = Low urgency (mentioned but not pressing)
     - 3 = Medium urgency (some timeline mentioned)
     - 4 = High urgency (specific deadline or blocking issue)
     - 5 = Critical urgency (urgent, ASAP, blocking, critical)
   - Mentioned Timeline: Extract any timeline mentioned (e.g., "Q3 2024", "September", "next quarter", "in 6 months", "before Q3", "by end of year"). If no timeline is mentioned, omit this field.
   - Raw Quote: Extract the exact quote or sentence from the transcript where this pain point was mentioned. Include enough context to understand the statement (1-3 sentences). If you cannot find a specific quote, omit this field.

Return ONLY a JSON object with "organization_name" and "needs" array. Example format:
{
  "organization_name": "Acme Corporation",
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
        model: process.env.PERPLEXITY_MODEL || "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
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
    const parsedResponse = extractValidJson(completion);

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("Perplexity response parsed:", JSON.stringify(parsedResponse, null, 2));
    }

    const organizationName = parsedResponse.organization_name?.trim();
    const customerNeeds = parsedResponse.needs || [];

    if (process.env.NODE_ENV === "development") {
      console.log("Extracted organization name:", organizationName);
      console.log("Extracted customer needs count:", customerNeeds.length);
    }

    if (!organizationName) {
      console.error("No organization name extracted from response:", parsedResponse);
      return NextResponse.json(
        { error: "Could not extract organization name from transcript" },
        { status: 400 }
      );
    }

    // Step 2: Create or find organization
    let orgId: string;
    
    // Check if organization exists
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("name", organizationName)
      .single();

    if (existingOrg) {
      orgId = existingOrg.id;
      if (process.env.NODE_ENV === "development") {
        console.log("Using existing organization:", orgId, organizationName);
      }
    } else {
      // Create new organization
      if (process.env.NODE_ENV === "development") {
        console.log("Creating new organization:", organizationName);
      }
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name: organizationName })
        .select()
        .single();

      if (orgError || !newOrg) {
        console.error("Error creating organization:", orgError);
        return NextResponse.json(
          { error: `Failed to create organization: ${orgError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
      orgId = newOrg.id;
      if (process.env.NODE_ENV === "development") {
        console.log("Created organization successfully:", orgId, newOrg);
      }
    }

    // Step 3: Save transcript to calls table
    if (process.env.NODE_ENV === "development") {
      console.log("Saving call to database for org:", orgId);
    }
    const { data: callData, error: callError } = await supabaseAdmin
      .from("calls")
      .insert({
        org_id: orgId,
        transcript_text: transcript,
      })
      .select()
      .single();

    if (callError) {
      console.error("Error saving call to database:", callError);
      return NextResponse.json(
        { error: `Failed to save call to database: ${callError.message}` },
        { status: 500 }
      );
    }

    if (!callData || !callData.id) {
      console.error("Call data is null or missing id:", callData);
      return NextResponse.json(
        { error: "Failed to create call record" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Call saved successfully:", callData.id);
    }

    // Step 4: Save insights to extracted_insights table
    if (customerNeeds.length === 0) {
      return NextResponse.json({
        success: true,
        call_id: callData.id,
        organization_name: organizationName,
        org_id: orgId,
        insights: [],
        count: 0,
      });
    }

    // Helper function to calculate follow-up date from mentioned timeline
    const calculateFollowUpDate = (timeline?: string): string | null => {
      if (!timeline) return null;

      const now = new Date();
      const lowerTimeline = timeline.toLowerCase();

      // Handle quarter references
      if (lowerTimeline.includes("q1")) {
        const year = now.getFullYear() + (now.getMonth() < 3 ? 0 : 1);
        return new Date(year, 0, 1).toISOString();
      }
      if (lowerTimeline.includes("q2")) {
        const year = now.getFullYear() + (now.getMonth() < 6 ? 0 : 1);
        return new Date(year, 3, 1).toISOString();
      }
      if (lowerTimeline.includes("q3")) {
        const year = now.getFullYear() + (now.getMonth() < 9 ? 0 : 1);
        return new Date(year, 6, 1).toISOString();
      }
      if (lowerTimeline.includes("q4")) {
        const year = now.getFullYear() + (now.getMonth() < 12 ? 0 : 1);
        return new Date(year, 9, 1).toISOString();
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

      return null;
    };

    const insightsToInsert = customerNeeds
      .filter((need: any) => need.painPoint && need.urgency)
      .map((need: any) => ({
        call_id: callData.id,
        pain_point_description: need.painPoint.trim(),
        raw_quote: need.rawQuote?.trim() || null,
        urgency_level: Math.max(1, Math.min(5, Math.round(need.urgency))),
        mentioned_timeline: need.mentionedTimeline?.trim() || null,
        follow_up_date: calculateFollowUpDate(need.mentionedTimeline),
        status: "pending",
      }));

    if (process.env.NODE_ENV === "development") {
      console.log("Inserting insights:", insightsToInsert.length, "insights");
    }
    const { data: insertedInsights, error: insertError } = await supabaseAdmin
      .from("extracted_insights")
      .insert(insightsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting insights into database:", insertError);
      return NextResponse.json(
        { error: `Failed to save insights to database: ${insertError.message}` },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Successfully saved:", {
        organization: organizationName,
        org_id: orgId,
        call_id: callData.id,
        insights_count: insertedInsights?.length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      call_id: callData.id,
      organization_name: organizationName,
      org_id: orgId,
      insights: insertedInsights || [],
      count: insertedInsights?.length || 0,
    });
  } catch (error) {
    console.error("Error analyzing and saving transcript:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze and save transcript",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
