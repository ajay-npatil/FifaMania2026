import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "./supabaseServer";

export const SESSION_COOKIE = "fifamania_session";

export interface SessionUser {
  id: string;
  display_name: string;
  is_admin: boolean;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Reads the current session cookie and looks up the user.
 * Returns null if there is no valid session.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, is_admin")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as SessionUser;
}
