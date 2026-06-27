import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { predictWinnerLockAt } from "@/lib/predictWinner";
import { emptyBracket } from "@/lib/bracket";

/**
 * Everyone's Predict-a-Winner picks — but only after the freeze, so nobody
 * can see (or copy) others' picks while predictions are still open.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!user.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const lockAt = await predictWinnerLockAt(supabase);
  const locked = Date.now() >= lockAt.getTime();

  if (!locked) {
    return NextResponse.json({ locked: false, lockAt: lockAt.toISOString(), picks: [] });
  }

  const { data: users } = await supabase.from("users").select("id, display_name");
  const nameById = new Map((users ?? []).map((u) => [u.id, u.display_name]));

  const { data: preds } = await supabase
    .from("tournament_predictions")
    .select("user_id, top_country, top_scorer, golden_ball, golden_glove, bracket");

  const picks = (preds ?? [])
    .map((p) => ({
      display_name: nameById.get(p.user_id) ?? "—",
      top_country: p.top_country ?? null,
      top_scorer: p.top_scorer ?? null,
      golden_ball: p.golden_ball ?? null,
      golden_glove: p.golden_glove ?? null,
      bracket: p.bracket ?? emptyBracket(),
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({ locked: true, lockAt: lockAt.toISOString(), picks });
}
