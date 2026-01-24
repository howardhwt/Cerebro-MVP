import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Debug endpoint to check what's actually in the database
 * This helps verify if data is being saved correctly
 */
export async function GET() {
  try {
    // Check organizations
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    // Check calls
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("calls")
      .select("id, org_id, transcript_text, call_date")
      .order("call_date", { ascending: false })
      .limit(5);

    // Check insights
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("extracted_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      organizations: {
        count: orgs?.length || 0,
        data: orgs || [],
        error: orgError?.message || null,
      },
      calls: {
        count: calls?.length || 0,
        data: calls || [],
        error: callsError?.message || null,
      },
      insights: {
        count: insights?.length || 0,
        data: insights || [],
        error: insightsError?.message || null,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
