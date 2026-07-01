"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, CheckCircle, Save, Pencil, History, ChevronRight } from "lucide-react";
import Link from "next/link";

interface TestResult {
  id: string;
  test_id: string;
  status: string;
  result_value: string;
  result_unit: string;
  result_flag: string;
  result_notes: string;
  completed_by?: string;
  completed_at?: string;
  test: {
    name: string;
    short_code: string;
    category?: string;
    reference_range?: string;
    unit?: string;
    sample_type?: string;
  };
}

type RowDraft = {
  result_value: string;
  result_unit: string;
  result_flag: string;
  result_notes: string;
  dirty: boolean;
  saving: boolean;
};

const FLAG_STYLES: Record<string, string> = {
  normal:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  low:      "text-amber-700  bg-amber-50  border-amber-200",
  high:     "text-amber-700  bg-amber-50  border-amber-200",
  critical: "text-red-700    bg-red-50    border-red-200 font-bold",
};

const FLAG_BADGE: Record<string, string> = {
  normal:   "bg-emerald-100 text-emerald-700",
  low:      "bg-amber-100   text-amber-700",
  high:     "bg-amber-100   text-amber-700",
  critical: "bg-red-100     text-red-700 font-bold",
};

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { toast } = useToast();
  const [orderTests, setOrderTests] = useState<TestResult[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${orderId}`);
      if (!r.ok) throw new Error("Failed to load");
      const d = await r.json();
      const tests: TestResult[] = d.order?.order_tests ?? [];
      setOrderTests(tests);
      setDrafts(prev => {
        const next: Record<string, RowDraft> = {};
        tests.forEach((t: TestResult) => {
          next[t.id] = prev[t.id] ?? {
            result_value: t.result_value ?? "",
            result_unit:  t.result_unit  ?? t.test?.unit ?? "",
            result_flag:  t.result_flag  ?? "",
            result_notes: t.result_notes ?? "",
            dirty: false,
            saving: false,
          };
        });
        return next;
      });
    } catch {
      toast("Failed to load order tests", "error");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  function setField(id: string, key: keyof RowDraft, value: string) {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value, dirty: true },
    }));
  }

  function startEdit(id: string) {
    setEditingIds(prev => new Set([...prev, id]));
  }

  function cancelEdit(id: string, ot: TestResult) {
    setDrafts(prev => ({
      ...prev,
      [id]: {
        result_value: ot.result_value ?? "",
        result_unit:  ot.result_unit  ?? ot.test?.unit ?? "",
        result_flag:  ot.result_flag  ?? "",
        result_notes: ot.result_notes ?? "",
        dirty: false,
        saving: false,
      },
    }));
    setEditingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function saveRow(ot: TestResult) {
    const d = drafts[ot.id];
    if (!d?.result_value?.trim()) { toast("Result value is required", "error"); return; }
    setDrafts(prev => ({ ...prev, [ot.id]: { ...prev[ot.id], saving: true } }));
    const res = await fetch(`/api/orders/${orderId}/tests/${ot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result_value: d.result_value,
        result_unit:  d.result_unit,
        result_flag:  d.result_flag || undefined,
        result_notes: d.result_notes,
        status: "completed",
      }),
    });
    if (res.ok) {
      toast(`${ot.test.name} saved`, "success");
      setOrderTests(prev => prev.map(t => t.id === ot.id
        ? { ...t, status: "completed",
            result_value: d.result_value, result_unit: d.result_unit,
            result_flag: d.result_flag, result_notes: d.result_notes }
        : t
      ));
      setDrafts(prev => ({ ...prev, [ot.id]: { ...prev[ot.id], dirty: false, saving: false } }));
      setEditingIds(prev => { const n = new Set(prev); n.delete(ot.id); return n; });
    } else {
      const data = await res.json();
      toast(data.error ?? "Save failed", "error");
      setDrafts(prev => ({ ...prev, [ot.id]: { ...prev[ot.id], saving: false } }));
    }
  }

  async function saveAll() {
    const pending = orderTests.filter(t => t.status !== "completed" || editingIds.has(t.id));
    for (const ot of pending) await saveRow(ot);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  );

  const completedCount = orderTests.filter(t => t.status === "completed").length;
  const total = orderTests.length;
  const pct = total ? Math.round((completedCount / total) * 100) : 0;

  // Group by category
  const byCategory: Record<string, TestResult[]> = {};
  orderTests.forEach(t => {
    const cat = t.test.category ?? "Other";
    (byCategory[cat] ??= []).push(t);
  });

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/orders/${orderId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Enter Results</h1>
          <p className="text-sm text-gray-500">
            {completedCount} of {total} completed
            {completedCount < total && (
              <span className="ml-2 text-amber-600">· {total - completedCount} pending</span>
            )}
          </p>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-32">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-xs text-gray-400 mt-0.5">{pct}%</p>
          </div>
          {completedCount < total && (
            <Button size="sm" onClick={saveAll} className="shrink-0">
              <Save className="h-3.5 w-3.5 mr-1.5" />Save All
            </Button>
          )}
        </div>
      </div>

      {/* Table per category */}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, tests]) => {
          const catDone = tests.filter(t => t.status === "completed").length;
          return (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{category}</h2>
                <span className="text-xs text-gray-500">{catDone}/{tests.length}</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-56">Test</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-48">Reference Range</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-32">Result *</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-24">Unit</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-28">Flag</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Notes</th>
                      <th className="px-3 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((ot, idx) => {
                      const d = drafts[ot.id] ?? { result_value: "", result_unit: "", result_flag: "", result_notes: "", dirty: false, saving: false };
                      const isDone = ot.status === "completed";
                      const isEditing = editingIds.has(ot.id);
                      const editable = !isDone || isEditing;
                      const flagStyle = d.result_flag ? FLAG_STYLES[d.result_flag] ?? "" : "";

                      return (
                        <tr
                          key={ot.id}
                          className={[
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                            isDone && !isEditing ? "opacity-90" : "",
                            isEditing ? "bg-amber-50/40" : "",
                          ].join(" ")}
                        >
                          {/* Test name */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {isDone && !isEditing && (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium text-gray-800 leading-tight">{ot.test.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{ot.test.short_code}</p>
                              </div>
                            </div>
                          </td>

                          {/* Reference range */}
                          <td className="px-3 py-2.5">
                            <p className="text-xs text-gray-500 leading-tight">
                              {ot.test.reference_range ?? "—"}
                              {ot.test.unit && ot.test.reference_range && (
                                <span className="text-gray-400 ml-1">{ot.test.unit}</span>
                              )}
                            </p>
                          </td>

                          {/* Result value */}
                          <td className="px-3 py-2.5">
                            {editable ? (
                              <input
                                type="text"
                                value={d.result_value}
                                onChange={e => setField(ot.id, "result_value", e.target.value)}
                                placeholder="e.g. 12.5"
                                className={[
                                  "w-full px-2 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                  !d.result_value ? "border-red-200 bg-red-50/30" : "border-gray-200",
                                  flagStyle,
                                ].join(" ")}
                              />
                            ) : (
                              <span className={`text-sm font-semibold ${d.result_flag ? FLAG_STYLES[d.result_flag]?.split(" ")[0] ?? "text-gray-900" : "text-gray-900"}`}>
                                {ot.result_value || "—"}
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="px-3 py-2.5">
                            {editable ? (
                              <input
                                type="text"
                                value={d.result_unit}
                                onChange={e => setField(ot.id, "result_unit", e.target.value)}
                                placeholder={ot.test.unit ?? "unit"}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-sm text-gray-600">{ot.result_unit || ot.test.unit || "—"}</span>
                            )}
                          </td>

                          {/* Flag */}
                          <td className="px-3 py-2.5">
                            {editable ? (
                              <select
                                value={d.result_flag}
                                onChange={e => setField(ot.id, "result_flag", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">— flag —</option>
                                <option value="normal">✓ Normal</option>
                                <option value="low">↓ Low</option>
                                <option value="high">↑ High</option>
                                <option value="critical">⚠ Critical</option>
                              </select>
                            ) : ot.result_flag ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${FLAG_STYLES[ot.result_flag] ?? ""}`}>
                                {ot.result_flag === "normal" ? "✓" : ot.result_flag === "low" ? "↓" : ot.result_flag === "high" ? "↑" : "⚠"}{" "}
                                {ot.result_flag.charAt(0).toUpperCase() + ot.result_flag.slice(1)}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>

                          {/* Notes */}
                          <td className="px-3 py-2.5">
                            {editable ? (
                              <input
                                type="text"
                                value={d.result_notes}
                                onChange={e => setField(ot.id, "result_notes", e.target.value)}
                                placeholder="optional notes"
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-xs text-gray-500 truncate max-w-[140px] block">{ot.result_notes || "—"}</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-3 py-2.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => saveRow(ot)}
                                  disabled={d.saving || !d.result_value?.trim()}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {d.saving ? "…" : "Save"}
                                </button>
                                <button
                                  onClick={() => cancelEdit(ot.id, ot)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : isDone ? (
                              <button
                                onClick={() => startEdit(ot.id)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Pencil className="h-3 w-3" />Edit
                              </button>
                            ) : (
                              <button
                                onClick={() => saveRow(ot)}
                                disabled={d.saving || !d.result_value?.trim()}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {d.saving ? (
                                  <div className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editing correction notice */}
      {editingIds.size > 0 && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <History className="h-4 w-4 shrink-0" />
          Corrections will be saved in the audit log with the previous values.
        </div>
      )}

      {/* All done */}
      {completedCount === total && total > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-sm font-medium text-emerald-800">All {total} results entered</p>
          <p className="text-xs text-emerald-600 mt-0.5">You can now generate the report</p>
        </div>
      )}

      <div className="mt-6">
        <Link href={`/orders/${orderId}/report`}>
          <Button className="w-full" variant={completedCount === total ? "default" : "outline"}>
            {completedCount === total ? "Generate Report" : "Go to Report Page"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
