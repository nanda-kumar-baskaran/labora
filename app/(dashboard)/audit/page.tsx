"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, ChevronLeft, ChevronRight, Search, X, User, Clock, Tag } from "lucide-react";
import { format, parseISO } from "date-fns";

const ENTITY_COLORS: Record<string, string> = {
  patient: "bg-purple-100 text-purple-700",
  order_test: "bg-blue-100 text-blue-700",
  test_catalog: "bg-amber-100 text-amber-700",
  tenant: "bg-red-100 text-red-700",
};

const ACTION_COLORS: Record<string, string> = {
  update: "secondary",
  update_result: "default",
};

function ChangeRow({ field, from, to }: { field: string; from: unknown; to: unknown }) {
  const display = (v: unknown) => {
    if (v === null || v === undefined || v === "") return <span className="text-gray-300 italic">empty</span>;
    return <span>{String(v)}</span>;
  };

  return (
    <div className="flex items-start gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
      <span className="w-28 font-medium text-gray-500 shrink-0 pt-0.5">{field}</span>
      <span className="flex-1 text-gray-400 line-through">{display(from)}</span>
      <span className="text-gray-400 shrink-0">→</span>
      <span className="flex-1 text-gray-900 font-medium">{display(to)}</span>
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page) });
    if (entityType) sp.set("entity_type", entityType);
    if (entityId) sp.set("entity_id", entityId);
    const r = await fetch(`/api/audit?${sp}`);
    if (r.ok) {
      const d = await r.json();
      setLogs(d.data ?? []);
      setCount(d.count ?? 0);
    }
    setLoading(false);
  }, [page, entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalPages = Math.ceil(count / 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">{count} change records — all edits by all users</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Filter by type</label>
              <select
                value={entityType}
                onChange={e => { setEntityType(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-gray-200 text-sm px-2 pr-6 bg-white text-gray-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
              >
                <option value="">All types</option>
                <option value="patient">Patient</option>
                <option value="order_test">Test Result</option>
                <option value="test_catalog">Test Catalog</option>
                <option value="tenant">Lab Profile</option>
              </select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500">Entity ID (exact)</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  value={entityId}
                  onChange={e => { setEntityId(e.target.value); setPage(1); }}
                  placeholder="Paste entity ID to see its full history…"
                  className="pl-8 h-9 text-sm"
                />
                {entityId && (
                  <button onClick={() => { setEntityId(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {(entityType || entityId) && (
              <Button variant="outline" size="sm" onClick={() => { setEntityType(""); setEntityId(""); setPage(1); }}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
          <Shield className="h-12 w-12" />
          <p className="text-sm">No changes recorded yet</p>
          <p className="text-xs text-gray-400">Edits to patients, test results, and settings will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isOpen = expanded.has(log.id);
            const changeCount = Object.keys(log.changes ?? {}).length;
            const entityColor = ENTITY_COLORS[log.entity_type] ?? "bg-gray-100 text-gray-600";

            return (
              <div
                key={log.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(log.id)}
                >
                  {/* Entity type badge */}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${entityColor}`}>
                    {log.entity_type.replace("_", " ")}
                  </span>

                  {/* Entity label / action */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.entity_label || log.entity_id}
                    </p>
                    <p className="text-xs text-gray-400">
                      {changeCount} field{changeCount !== 1 ? "s" : ""} changed
                    </p>
                  </div>

                  {/* Actor */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium">{log.actor_name}</span>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 min-w-[90px] justify-end">
                    <Clock className="h-3.5 w-3.5" />
                    <span title={log.created_at}>
                      {(() => { try { return format(parseISO(log.created_at), "dd MMM, HH:mm"); } catch { return log.created_at; } })()}
                    </span>
                  </div>

                  {/* Expand indicator */}
                  <ChevronLeft className={`h-4 w-4 text-gray-300 shrink-0 transition-transform ${isOpen ? "-rotate-90" : ""}`} />
                </button>

                {/* Expanded diff */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400 font-mono">{log.entity_id}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      <div className="flex gap-2 text-xs font-semibold text-gray-400 pb-1 mb-1 border-b border-gray-200">
                        <span className="w-28 shrink-0">Field</span>
                        <span className="flex-1">Before</span>
                        <span className="flex-1">After</span>
                      </div>
                      {Object.entries(log.changes ?? {}).map(([field, { old: from, new: to }]: any) => (
                        <ChangeRow key={field} field={field} from={from} to={to} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">Page {page} of {totalPages} · {count} total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
