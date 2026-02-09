import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["to_do", "scheduled_call", "proceed", "sales_loss", "pending"];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, followUpDate, status } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: "insightId is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, string | null> = {};

    if (followUpDate !== undefined) {
      // Accept YYYY-MM-DD string or null to clear
      updates.follow_up_date = followUpDate ? new Date(followUpDate).toISOString() : null;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update. Provide followUpDate or status." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("extracted_insights")
      .update(updates)
      .eq("id", insightId)
      .select()
      .single();

    if (error) {
      console.error("Error updating insight:", error);
      return NextResponse.json(
        { error: `Failed to update insight: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, insight: data });
  } catch (error) {
    console.error("Error in update-insight:", error);
    return NextResponse.json(
      { error: "Failed to update insight", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
