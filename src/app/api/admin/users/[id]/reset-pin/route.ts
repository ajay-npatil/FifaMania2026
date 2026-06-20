import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { id } = await params;
  const { pin } = await req.json();

  if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN must be 4-8 digits." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const pin_hash = await hashPin(pin);

  const { data, error } = await supabase
    .from("users")
    .update({ pin_hash })
    .eq("id", id)
    .select("id, display_name")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not reset PIN." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, display_name: data.display_name });
}
