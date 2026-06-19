import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { verifyPin, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { display_name, pin } = await req.json();

  if (typeof display_name !== "string" || typeof pin !== "string") {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("id, display_name, is_admin, pin_hash")
    .ilike("display_name", display_name.trim())
    .maybeSingle();

  if (!user) {
    return NextResponse.json(
      { error: "No account with that name." },
      { status: 401 }
    );
  }

  const ok = await verifyPin(pin, user.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const res = NextResponse.json({
    user: {
      id: user.id,
      display_name: user.display_name,
      is_admin: user.is_admin,
    },
  });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
