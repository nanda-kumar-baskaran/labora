/**
 * Canonical role → action permission map for Labora.
 *
 * Roles:
 *   admin       — full access to everything
 *   staff       — patient registration, order creation, billing, viewing
 *   technician  — sample collection, result entry, no billing/financials
 *   pathologist — result entry, report verification, no billing/financials
 *
 * Use `can(session, "action")` in API routes and server pages.
 */
import type { SessionUser } from "@/lib/session";

export type UserRole = "admin" | "staff" | "technician" | "pathologist";

/** Map of action → roles that are allowed */
export const PERMISSIONS: Record<string, UserRole[]> = {
  // Patients
  "patient:view":   ["admin", "staff", "technician", "pathologist"],
  "patient:create": ["admin", "staff"],
  "patient:edit":   ["admin", "staff"],

  // Orders
  "order:view":     ["admin", "staff", "technician", "pathologist"],
  "order:create":   ["admin", "staff"],
  "order:status":   ["admin", "staff", "technician"],

  // Results
  "result:enter":   ["admin", "technician", "pathologist"],

  // Reports
  "report:view":    ["admin", "staff", "pathologist"],
  "report:generate":["admin", "pathologist", "technician"],
  "report:verify":  ["admin", "pathologist"],

  // Billing — financial data restricted
  "billing:view":   ["admin", "staff"],
  "billing:record": ["admin", "staff"],

  // Doctors / referrals
  "doctor:view":    ["admin", "staff"],
  "doctor:manage":  ["admin"],

  // Settings / admin
  "settings:view":  ["admin"],
  "settings:edit":  ["admin"],
  "audit:view":     ["admin"],
  "users:manage":   ["admin"],

  // Dashboard insights
  "dashboard:admin":     ["admin"],
  "dashboard:revenue":   ["admin"],
  "dashboard:work_queue":["technician", "pathologist"],
};

/** Check if a session user can perform an action */
export function can(session: SessionUser, action: string): boolean {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(session.role as UserRole);
}

/** Throw a 403 response if user lacks permission */
export function requirePermission(session: SessionUser, action: string): void {
  if (!can(session, action)) {
    throw new Error(`FORBIDDEN:${action}`);
  }
}

/** Pages each role is allowed to visit */
export const ROLE_PAGES: Record<UserRole, string[]> = {
  admin: [
    "/dashboard", "/home", "/patients", "/orders", "/reports",
    "/billing", "/doctors", "/settings", "/audit",
  ],
  staff: ["/home", "/patients", "/orders", "/reports", "/billing", "/doctors"],
  technician: ["/home", "/patients", "/orders", "/reports"],
  pathologist: ["/home", "/patients", "/orders", "/reports"],
};

/** Default landing page per role after login */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard",
  staff: "/home",
  technician: "/home",
  pathologist: "/home",
};

/** Return true if this role can visit this path */
export function canVisit(role: UserRole, path: string): boolean {
  const pages = ROLE_PAGES[role] ?? [];
  return pages.some(p => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));
}
