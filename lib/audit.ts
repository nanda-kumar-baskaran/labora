/**
 * Audit log helper — computes field-level diff and persists to audit_log.
 * Call from API routes AFTER fetching old state and completing the update.
 *
 * Usage:
 *   const old = await repo.getPatient(id, tenantId);
 *   const updated = await repo.updatePatient(id, tenantId, body);
 *   await logAudit(repo, session, "update", "patient", id, old.full_name, old, body);
 */
import type { IRepository } from "@/lib/db/interface";

type Session = { id: string; fullName?: string; full_name?: string; tenant_id: string };

/**
 * Compute a diff between `oldObj` and `newFields`.
 * Only includes fields present in `newFields` that actually changed.
 */
export function diff(
  oldObj: Record<string, unknown>,
  newFields: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [k, newVal] of Object.entries(newFields)) {
    const oldVal = oldObj[k];
    // Loose compare to handle null vs undefined vs ""
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes[k] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }
  return changes;
}

export async function logAudit(
  repo: IRepository,
  session: Session,
  action: string,
  entityType: string,
  entityId: string,
  entityLabel: string | undefined,
  oldObj: Record<string, unknown>,
  newFields: Record<string, unknown>
): Promise<void> {
  const changes = diff(oldObj, newFields);
  if (Object.keys(changes).length === 0) return; // nothing actually changed

  try {
    await repo.createAuditLog({
      tenant_id: session.tenant_id,
      actor_id: session.id,
      actor_name: session.full_name ?? (session as any).fullName ?? session.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      changes,
    });
  } catch (e) {
    // Audit log failure must never break the main operation
    console.error("[audit] Failed to log:", e);
  }
}
