/**
 * Server-side page guard helper.
 * Call at the top of any server page/layout that needs role restriction.
 * Redirects to the caller's home page if unauthorized.
 */
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { can, ROLE_HOME, type UserRole } from "@/lib/permissions";

export async function guardPage(action: string) {
  const session = await requireSession();
  if (!can(session, action)) {
    redirect(ROLE_HOME[session.role as UserRole] ?? "/orders");
  }
  return session;
}
