import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

/**
 * API route to get companies overview with aggregated stats
 */
export async function GET() {
  try {
    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("company")
      .select("*")
      .order("name", { ascending: true });

    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      return NextResponse.json(
        { error: `Failed to fetch companies: ${companiesError.message}` },
        { status: 500 }
      );
    }

    // Get all calls with their insights count
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("calls")
      .select(`
        id,
        company_id,
        customer_name,
        call_date
      `);

    if (callsError) {
      console.error("Error fetching calls:", callsError);
      return NextResponse.json(
        { error: `Failed to fetch calls: ${callsError.message}` },
        { status: 500 }
      );
    }

    // Get all insights
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("extracted_insights")
      .select("id, call_id");

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      return NextResponse.json(
        { error: `Failed to fetch insights: ${insightsError.message}` },
        { status: 500 }
      );
    }

    // Build a map of call_id -> company_id
    const callToCompany: { [callId: string]: string } = {};
    const callsByCompany: { [companyId: string]: typeof calls } = {};

    calls?.forEach((call) => {
      callToCompany[call.id] = call.company_id;
      if (!callsByCompany[call.company_id]) {
        callsByCompany[call.company_id] = [];
      }
      callsByCompany[call.company_id].push(call);
    });

    // Count insights per company
    const insightsByCompany: { [companyId: string]: number } = {};
    insights?.forEach((insight) => {
      const companyId = callToCompany[insight.call_id];
      if (companyId) {
        insightsByCompany[companyId] = (insightsByCompany[companyId] || 0) + 1;
      }
    });

    // Build overview data for each company
    const companiesOverview = companies?.map((company) => {
      const companyCalls = callsByCompany[company.id] || [];
      const callCount = companyCalls.length;
      const painPointCount = insightsByCompany[company.id] || 0;

      // Get last contact date
      let lastContactDate: string | null = null;
      let contactPerson: string | null = null;

      if (companyCalls.length > 0) {
        const sortedCalls = [...companyCalls].sort((a, b) => {
          const dateA = a.call_date ? new Date(a.call_date).getTime() : 0;
          const dateB = b.call_date ? new Date(b.call_date).getTime() : 0;
          return dateB - dateA;
        });
        lastContactDate = sortedCalls[0].call_date ?? null;
        contactPerson = sortedCalls[0].customer_name || null;
      }

      // Determine customer type based on call history
      const customerType = callCount >= 3 ? "existing" : "new";

      return {
        id: company.id,
        name: company.name,
        contactPerson,
        lastContactDate,
        callCount,
        painPointCount,
        customerType,
        createdAt: company.created_at,
      };
    });

    return NextResponse.json({
      companies: companiesOverview || [],
    });
  } catch (error) {
    console.error("Error fetching companies overview:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch companies overview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
