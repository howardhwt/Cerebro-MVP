import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Mark this route as dynamic since it queries the database
export const dynamic = 'force-dynamic';

/**
 * API route to get all organizations
 */
export async function GET() {
  try {
    // Debug logging (remove in production or make conditional)
    if (process.env.NODE_ENV === "development") {
      console.log("Fetching organizations from database...");
    }
    
    // Try selecting all columns first to see if there's a column issue
    const { data: organizations, error, count } = await supabaseAdmin
      .from("organizations")
      .select("id, name, created_at", { count: "exact" })
      .order("name", { ascending: true });

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("Query result:", {
        dataLength: organizations?.length || 0,
        count: count,
        error: error?.message || null,
      });
    }

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizations: ${error.message}` },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Fetched organizations:", organizations?.length || 0, "organizations");
      if (organizations && organizations.length > 0) {
        console.log("Organization names:", organizations.map((o) => o.name));
      }
    }

    return NextResponse.json({
      organizations: organizations || [],
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch organizations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
