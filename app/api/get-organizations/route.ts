import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Mark this route as dynamic since it queries the database
export const dynamic = 'force-dynamic';

/**
 * API route to get all companys
 */
export async function GET() {
  try {
    // Debug logging (remove in production or make conditional)
    if (process.env.NODE_ENV === "development") {
      console.log("Fetching companys from database...");
    }

    // Try selecting all columns first to see if there's a column issue
    const { data: companys, error, count } = await supabaseAdmin
      .from("companys")
      .select("id, name, created_at", { count: "exact" })
      .order("name", { ascending: true });

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("Query result:", {
        dataLength: companys?.length || 0,
        count: count,
        error: error?.message || null,
      });
    }

    if (error) {
      console.error("Error fetching companys:", error);
      return NextResponse.json(
        { error: `Failed to fetch companys: ${error.message}` },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Fetched companys:", companys?.length || 0, "companys");
      if (companys && companys.length > 0) {
        console.log("company names:", companys.map((o) => o.name));
      }
    }

    return NextResponse.json({
      companys: companys || [],
    });
  } catch (error) {
    console.error("Error fetching companys:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch companys",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
