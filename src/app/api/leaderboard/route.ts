import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: users } = await supabase.from("users").select("id, display_name");
  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id, points_awarded")
    .not("points_awarded", "is", null);

  const totals = new Map<string, number>();
  for (const u of users ?? []) totals.set(u.id, 0);
  for (const p of predictions ?? []) {
    totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_awarded ?? 0));
  }

  const leaderboard = (users ?? [])
    .map((u) => ({ display_name: u.display_name, points: totals.get(u.id) ?? 0 }))
    .sort((a, b) => b.points - a.points);

  return NextResponse.json({ leaderboard });
}
