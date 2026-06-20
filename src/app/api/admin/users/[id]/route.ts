import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.is_admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't delete your own account while logged in as it." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // predictions.user_id has an `on delete cascade` foreign key, so removing
  // the user row also removes all of their predictions automatically.
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
