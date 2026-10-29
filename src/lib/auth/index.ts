import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Data-access guard: every admin page and server action calls this first. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

export { createSession, deleteSession, getSessionUser, type SessionUser } from "./session";
