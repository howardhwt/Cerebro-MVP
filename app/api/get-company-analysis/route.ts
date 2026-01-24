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
    if (companyName && !companyId) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from("company")
        .select("id")
        .eq("name", companyName)
        .single();

      if (companyError || !company) {
        return NextResponse.json(
          { error: `Company not found: ${companyName}` },
          { status: 404 }
        );
      }
      targetCompanyId = company.id;
    }

    // Get all calls for this company
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("calls")
      .select("id, transcript_text, customer_name, call_date")
      .eq("company_id", targetCompanyId)
      .order("call_date", { ascending: false });

    if (callsError) {
      console.error("Error fetching calls:", callsError);
      return NextResponse.json(
        { error: `Failed to fetch calls: ${callsError.message}` },
        { status: 500 }
      );
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        company_id: targetCompanyId,
        calls: [],
        insights: [],
      });
    }

    // Get all insights for these calls
    const callIds = calls.map((call) => call.id);
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("extracted_insights")
      .select("*")
      .in("call_id", callIds)
      .order("created_at", { ascending: false });

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      return NextResponse.json(
        { error: `Failed to fetch insights: ${insightsError.message}` },
        { status: 500 }
      );
    }

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
