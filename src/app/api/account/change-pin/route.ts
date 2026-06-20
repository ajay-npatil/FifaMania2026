import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPin, verifyPin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { current_pin, new_pin } = await req.json();

  if (typeof current_pin !== "string" || typeof new_pin !== "string") {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  if (!/^\d{4,8}$/.test(new_pin)) {
    return NextResponse.json(
      { error: "New PIN must be 4-8 digits." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: row, error: lookupError } = await supabase
    .from("users")
    .select("pin_hash")
    .eq("id", user.id)
    .single();

  if (lookupError || !row) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const ok = await verifyPin(current_pin, row.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 401 });
  }

  const pin_hash = await hashPin(new_pin);
  const { error: updateError } = await supabase
    .from("users")
    .update({ pin_hash })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Could not update PIN." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
