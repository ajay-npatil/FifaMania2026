import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { computeStandings } from "@/lib/leaderboard";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const standings = await computeStandings(supabase);

  // Most recent snapshot, if any, to compute movement against.
  const { data: latest } = await supabase
    .from("leaderboard_snapshots")
    .select("batch_id, captured_at")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev = new Map<string, { rank: number; points: number }>();
  if (latest) {
    const { data: snapRows } = await supabase
      .from("leaderboard_snapshots")
      .select("user_id, rank, points")
      .eq("batch_id", latest.batch_id);
    for (const r of snapRows ?? []) {
      prev.set(r.user_id, { rank: r.rank, points: r.points });
    }
  }

  const leaderboard = standings.map((s) => {
    const before = prev.get(s.user_id);
    return {
      display_name: s.display_name,
      points: s.points,
      match: s.match,
      knockout: s.knockout,
      bonus: s.bonus,
      rank: s.rank,
      // Positive = climbed, negative = dropped, null = no prior snapshot.
      rankDelta: before ? before.rank - s.rank : null,
      pointsGained: before ? s.points - before.points : null,
      isNew: latest ? !before : false,
    };
  });

  return NextResponse.json({
    leaderboard,
    hasSnapshot: !!latest,
    snapshotAt: latest?.captured_at ?? null,
  });
}
