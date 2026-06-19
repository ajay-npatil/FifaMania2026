import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { hashPin, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { display_name, pin } = await req.json();

  if (
    typeof display_name !== "string" ||
    display_name.trim().length < 2 ||
    display_name.trim().length > 30
  ) {
    return NextResponse.json(
      { error: "Name must be between 2 and 30 characters." },
      { status: 400 }
    );
  }

  if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN must be 4-8 digits." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const name = display_name.trim();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("display_name", name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That name is already taken. Pick another." },
      { status: 409 }
    );
  }

  const pin_hash = await hashPin(pin);

  const { data, error } = await supabase
    .from("users")
    .insert({ display_name: name, pin_hash })
    .select("id, display_name, is_admin")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ user: data });
  res.cookies.set(SESSION_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return res;
}
