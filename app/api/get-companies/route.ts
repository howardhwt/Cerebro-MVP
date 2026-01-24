import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Mark this route as dynamic since it queries the database
export const dynamic = 'force-dynamic';

/**
 * API route to get all companies
 */
export async function GET() {
  try {
    // Debug logging (remove in production or make conditional)
    if (process.env.NODE_ENV === "development") {
      console.log("Fetching companies from database...");
    }
    
    // Query companies - using select("*") to match debug endpoint that works
    const { data: companies, error, count } = await supabaseAdmin
      .from("company")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("Query result:", {
        dataLength: companies?.length || 0,
        count: count,
        error: error?.message || null,
      });
    }

    if (error) {
      console.error("Error fetching companies:", error);
      return NextResponse.json(
        { error: `Failed to fetch companies: ${error.message}` },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Fetched companies:", companies?.length || 0, "companies");
      if (companies && companies.length > 0) {
        console.log("Company names:", companies.map((c) => c.name));
      }
    }

    return NextResponse.json({
      companies: companies || [],
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch companies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
