import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractValidJson } from "@/lib/extract-json";

// Mark this route as dynamic since it uses external APIs
export const dynamic = 'force-dynamic';

/**
 * API route that:
 * 1. Analyzes transcript using Perplexity (extracts pain points AND company name)
 * 2. Creates/finds company in company table
 * 3. Saves transcript to calls table with company_id
 * 4. Saves extracted insights to extracted_insights table
 * Expects: { transcript: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { transcript, pin, validateOnly } = await request.json();

    // Handle PIN validation only request
    if (validateOnly) {
      const correctPin = process.env.EXTRACTION_PIN || "4321";
      if (pin === correctPin) {
        return NextResponse.json({ success: true, verified: true });
      } else {
        return NextResponse.json(
          { error: "Incorrect PIN. Please try again." },
          { status: 401 }
        );
      }
    }

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate PIN if provided
    if (pin) {
      const correctPin = process.env.EXTRACTION_PIN || "4321";
      if (pin !== correctPin) {
        return NextResponse.json(
          { error: "Incorrect PIN. Please try again." },
          { status: 401 }
        );
      }
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: "Perplexity API key is not configured" },
        { status: 500 }
      );
    }

    // Step 1: Call Perplexity API to extract insights AND company name
    const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const systemPrompt = `You are the Cerebro Analysis Engine. Your goal is to identify high-intent sales signals from a customer call transcript and find the "Silent Revenue Leak."

Instructions:

0. Extract the following metadata from the transcript:
   - customer_name: The name of the customer/prospect who is speaking in the call. Extract the full name if mentioned, or use "Customer" if not clearly identified.
   - call_summary: Create a brief 2-3 sentence summary of the entire call conversation, focusing on the main topics discussed and key outcomes.

1. Extract every specific Pain Point mentioned by the customer.

2. Group and summarize similar pain points (different ways of describing the same problem, multiple mentions of the same problem). When grouping, create a single consolidated description that captures the essence of the grouped pain points.

CRITICAL: Keep pain point descriptions SHORT and CONCISE. Aim for 3-8 words maximum. Use a brief, memorable label rather than a full explanation. 
- Good: "Data silos across teams"
- Bad: "Data silos across teams - sales, customer success, and product teams using different tools and spreadsheets with no single source of truth"
- Good: "SOC2 compliance blocking growth"
- Bad: "SOC2 compliance challenges that are preventing the company from expanding into new markets and closing enterprise deals"
The full context and details should be in the quote field, not the description. The description should be a quick, scannable label.

3. For each pain point, capture the Exact Quotes as evidence. Include the most representative quote that best illustrates the pain point.

4. Identify the Person Mentioned: Extract the name of the person who mentioned this pain point in the transcript. This could be the customer, prospect, or any participant in the call. If the person is not clearly identified, use "Customer" or "Prospect" as a default. If multiple people mention the same pain point, use the primary speaker's name.

5. Evaluate the customer's tone and vocabulary, then assign an Urgency Level (1-5) based on the evaluation:
   - 1 = Very low urgency (mentioned casually, no emotional weight, no timeline)
   - 2 = Low urgency (mentioned but not pressing, minimal concern expressed)
   - 3 = Medium urgency (some concern expressed, timeline mentioned but not critical)
   - 4 = High urgency (strong concern, specific deadline, blocking issue, frustration evident)
   - 5 = Critical urgency (urgent language, ASAP, blocking critical operations, high frustration/desperation)

6. Identify any Timeline Mentions (e.g., 'next quarter', 'by September', 'in 3 months', 'after we hire a PM', 'before Q3', 'by end of year'). Extract the exact phrase used.

7. Calculate a 'Follow-up Date' based on today's date (${currentDate}). 
   - If they say 'in 3 months', set the date to exactly 90 days from ${currentDate}
   - If they say 'next quarter', calculate the start of the next quarter
   - If they say 'by September', set to September 1st of the current or next year as appropriate
   - If they say 'in 6 months', set to exactly 180 days from ${currentDate}
   - Format the date as YYYY-MM-DD

IMPORTANT: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return only the JSON object.

Output Format: Provide a JSON object with "company_name", "customer_name", "call_summary", and "pains" array matching this schema:
{
  "company_name": "Acme Corporation",
  "customer_name": "Jennifer Walsh",
  "call_summary": "The call focused on discussing SOC2 compliance challenges and data migration issues. The customer expressed urgency around resolving compliance before Q3 to enable enterprise deals.",
  "pains": [
    {
      "description": "SOC2 compliance blocking growth",
      "quote": "honestly right now we are struggling with SOC2 compliance. We need to solve that before Q3.",
      "person_mentioned": "Jennifer Walsh",
      "urgency": 4,
      "timeline": "Before Q3",
      "calculated_date": "2024-07-01"
    },
    {
      "description": "Data migration issues",
      "quote": "We're having issues with our data migration and we'll need to address this next quarter.",
      "person_mentioned": "Jennifer Walsh",
      "urgency": 3,
      "timeline": "Next quarter",
      "calculated_date": "2024-04-01"
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

    const companyName = parsedResponse.company_name?.trim();
    const customerName = parsedResponse.customer_name?.trim() || null;
    const callSummary = parsedResponse.call_summary?.trim() || null;
    const pains = parsedResponse.pains || [];

    if (process.env.NODE_ENV === "development") {
      console.log("Extracted company name:", companyName);
      console.log("Extracted customer name:", customerName);
      console.log("Extracted call summary:", callSummary);
      console.log("Extracted pain points count:", pains.length);
    }

    if (!companyName) {
      console.error("No company name extracted from response:", parsedResponse);
      return NextResponse.json(
        { error: "Could not extract company name from transcript" },
        { status: 400 }
      );
    }

    // Step 2: Create or find company
    let companyId: string;
    
    // Check if company exists (handle case-insensitive matching and duplicates)
    const { data: existingCompanies } = await supabaseAdmin
      .from("company")
      .select("id, name, created_at")
      .ilike("name", companyName) // Case-insensitive match
      .order("created_at", { ascending: false });
    
    const existingCompany = existingCompanies && existingCompanies.length > 0 
      ? existingCompanies[0] // Use most recently created if duplicates exist
      : null;

    if (existingCompany) {
      companyId = existingCompany.id;
      if (process.env.NODE_ENV === "development") {
        console.log("Using existing company:", companyId, companyName);
      }
      
      // Delete all existing insights for this company before inserting new ones
      // Get all call IDs for this company first
      const { data: existingCalls } = await supabaseAdmin
        .from("calls")
        .select("id")
        .eq("company_id", companyId);
      
      if (existingCalls && existingCalls.length > 0) {
        const existingCallIds = existingCalls.map((call) => call.id);
        const { error: deleteError } = await supabaseAdmin
          .from("extracted_insights")
          .delete()
          .in("call_id", existingCallIds);
        
        if (deleteError) {
          console.error("Error deleting existing insights:", deleteError);
          // Continue anyway - we'll still insert new insights
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log(`Deleted ${existingCallIds.length} existing call(s) insights for company:`, companyName);
          }
        }
      }
    } else {
      // Create new company
      if (process.env.NODE_ENV === "development") {
        console.log("Creating new company:", companyName);
      }
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from("company")
        .insert({ name: companyName })
        .select()
        .single();

      if (companyError || !newCompany) {
        console.error("Error creating company:", companyError);
        return NextResponse.json(
          { error: `Failed to create company: ${companyError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
      companyId = newCompany.id;
      if (process.env.NODE_ENV === "development") {
        console.log("Created company successfully:", companyId, newCompany);
      }
    }

    // Step 3: Save transcript to calls table
    if (process.env.NODE_ENV === "development") {
      console.log("Saving call to database for company:", companyId);
    }
    const { data: callData, error: callError } = await supabaseAdmin
      .from("calls")
      .insert({
        company_id: companyId,
        transcript_text: transcript,
        customer_name: customerName,
        call_summary: callSummary,
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
    if (pains.length === 0) {
      return NextResponse.json({
        success: true,
        call_id: callData.id,
        company_name: companyName,
        company_id: companyId,
        insights: [],
        count: 0,
      });
    }

    // Helper function to parse calculated_date or calculate from timeline if needed
    const parseFollowUpDate = (calculatedDate?: string, timeline?: string): string | null => {
      // If AI provided calculated_date, use it (format: YYYY-MM-DD)
      if (calculatedDate) {
        try {
          // Validate and format the date
          const date = new Date(calculatedDate);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Return as YYYY-MM-DD
          }
        } catch (e) {
          // Fall through to timeline calculation
        }
      }

      // Fallback: calculate from timeline if calculated_date not provided
      if (!timeline) return null;

      const now = new Date();
      const lowerTimeline = timeline.toLowerCase();

      // Handle "in X months" - add months to current date
      const monthsMatch = lowerTimeline.match(/in (\d+)\s*months?/);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1]);
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + months);
        return futureDate.toISOString().split('T')[0];
      }

      // Handle "in X days"
      const daysMatch = lowerTimeline.match(/in (\d+)\s*days?/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + days);
        return futureDate.toISOString().split('T')[0];
      }

      // Handle quarter references
      if (lowerTimeline.includes("q1")) {
        const year = now.getFullYear() + (now.getMonth() < 3 ? 0 : 1);
        return new Date(year, 0, 1).toISOString().split('T')[0];
      }
      if (lowerTimeline.includes("q2")) {
        const year = now.getFullYear() + (now.getMonth() < 6 ? 0 : 1);
        return new Date(year, 3, 1).toISOString().split('T')[0];
      }
      if (lowerTimeline.includes("q3")) {
        const year = now.getFullYear() + (now.getMonth() < 9 ? 0 : 1);
        return new Date(year, 6, 1).toISOString().split('T')[0];
      }
      if (lowerTimeline.includes("q4")) {
        const year = now.getFullYear() + (now.getMonth() < 12 ? 0 : 1);
        return new Date(year, 9, 1).toISOString().split('T')[0];
      }

      // Handle "next quarter"
      if (lowerTimeline.includes("next quarter")) {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        const year = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
        const month = nextQuarter * 3;
        return new Date(year, month, 1).toISOString().split('T')[0];
      }

      // Handle "next month"
      if (lowerTimeline.includes("next month")) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return futureDate.toISOString().split('T')[0];
      }

      // Handle month names (e.g., "by September")
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
      for (let i = 0; i < monthNames.length; i++) {
        if (lowerTimeline.includes(monthNames[i])) {
          const monthIndex = i;
          let year = now.getFullYear();
          // If the month has passed this year, use next year
          if (monthIndex < now.getMonth()) {
            year = now.getFullYear() + 1;
          }
          return new Date(year, monthIndex, 1).toISOString().split('T')[0];
        }
      }

      return null;
    };

    const insightsToInsert = pains
      .filter((pain: any) => pain.description && pain.urgency)
      .map((pain: any) => ({
        call_id: callData.id,
        pain_point_description: pain.description.trim(),
        raw_quote: pain.quote?.trim() || null,
        person_mentioned: pain.person_mentioned?.trim() || null,
        urgency_level: Math.max(1, Math.min(5, Math.round(pain.urgency))),
        mentioned_timeline: pain.timeline?.trim() || null,
        follow_up_date: parseFollowUpDate(pain.calculated_date, pain.timeline),
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
        company: companyName,
        company_id: companyId,
        call_id: callData.id,
        insights_count: insertedInsights?.length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      call_id: callData.id,
      company_name: companyName,
      company_id: companyId,
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
