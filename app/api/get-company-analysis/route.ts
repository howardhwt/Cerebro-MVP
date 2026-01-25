import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic';

/**
 * API route to get all analysis for a company
 * Query params: company_id or company_name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const companyName = searchParams.get("company_name");

    if (!companyId && !companyName) {
      return NextResponse.json(
        { error: "company_id or company_name query parameter is required" },
        { status: 400 }
      );
    }

    let targetCompanyId = companyId;

    // If company_name provided, find the company_id
    // If multiple companies with same name exist, get the most recent one (with most recent calls/insights)
    if (companyName && !companyId) {
      const { data: companies, error: companyError } = await supabaseAdmin
        .from("company")
        .select("id, name, created_at")
        .eq("name", companyName)
        .order("created_at", { ascending: false });

      if (companyError || !companies || companies.length === 0) {
        return NextResponse.json(
          { error: `Company not found: ${companyName}` },
          { status: 404 }
        );
      }

      // If multiple companies with same name, find the one with the most recent data
      if (companies.length > 1) {
        console.warn(`Multiple companies found with name "${companyName}". Checking which has data...`);
        
        // Check each company for calls/insights and pick the one with most recent data
        let bestCompanyId = companies[0].id; // Default to most recently created
        let bestCompanyCallCount = 0;
        let bestCompanyLatestCallDate: string | null = null;
        
        for (const company of companies) {
          const { data: calls } = await supabaseAdmin
            .from("calls")
            .select("id, call_date")
            .eq("company_id", company.id)
            .order("call_date", { ascending: false });
          
          if (calls && calls.length > 0) {
            const latestCallDate = calls[0]?.call_date;
            // Prefer company with more calls, or if equal, most recent call
            if (calls.length > bestCompanyCallCount || 
                (calls.length === bestCompanyCallCount && latestCallDate && 
                 (!bestCompanyLatestCallDate || latestCallDate > bestCompanyLatestCallDate))) {
              bestCompanyId = company.id;
              bestCompanyCallCount = calls.length;
              bestCompanyLatestCallDate = latestCallDate;
            }
          }
        }
        
        console.log(`Using company ID ${bestCompanyId} (found ${bestCompanyCallCount} calls)`);
        targetCompanyId = bestCompanyId;
      } else {
        targetCompanyId = companies[0].id;
      }
    }

    // Get all calls for this company
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("calls")
      .select("id, transcript_text, customer_name, call_summary, call_date")
      .eq("company_id", targetCompanyId)
      .order("call_date", { ascending: false });

    if (callsError) {
      console.error("Error fetching calls:", callsError);
      return NextResponse.json(
        { error: `Failed to fetch calls: ${callsError.message}` },
        { status: 500 }
      );
    }

    // Debug logging
    console.log("Company analysis query:", {
      companyName,
      companyId: targetCompanyId,
      callsFound: calls?.length || 0,
    });

    if (!calls || calls.length === 0) {
      console.warn("No calls found for company:", companyName, "ID:", targetCompanyId);
      return NextResponse.json({
        company_id: targetCompanyId,
        calls: [],
        insights: [],
      });
    }

    // Get all insights for these calls
    const callIds = calls.map((call) => call.id);
    console.log("Fetching insights for call IDs:", callIds);
    
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("extracted_insights")
      .select("id, call_id, pain_point_description, raw_quote, urgency_level, mentioned_timeline, follow_up_date, status, person_mentioned, created_at")
      .in("call_id", callIds)
      .order("created_at", { ascending: false });

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      return NextResponse.json(
        { error: `Failed to fetch insights: ${insightsError.message}` },
        { status: 500 }
      );
    }

    console.log("Insights found:", insights?.length || 0);

    return NextResponse.json({
      company_id: targetCompanyId,
      calls: calls || [],
      insights: insights || [],
    });
  } catch (error) {
    console.error("Error fetching company analysis:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch company analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
