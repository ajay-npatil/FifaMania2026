import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { computeStandings } from "@/lib/leaderboard";

/**
 * Freezes the current standings into leaderboard_snapshots. The leaderboard
 * then shows movement (rank ▲/▼ and points gained) relative to the most
 * recent snapshot. Capture one right before a round begins.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const standings = await computeStandings(supabase);

  if (standings.length === 0) {
    return NextResponse.json(
      { error: "No users to snapshot yet." },
      { status: 400 }
    );
  }

  const batch_id = randomUUID();
  const captured_at = new Date().toISOString();
  const rows = standings.map((s) => ({
    batch_id,
    user_id: s.user_id,
    rank: s.rank,
    points: s.points,
    captured_at,
  }));

  const { error } = await supabase.from("leaderboard_snapshots").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ captured: rows.length, captured_at });
}
