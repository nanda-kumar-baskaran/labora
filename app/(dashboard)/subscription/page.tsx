"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface SubInfo {
  status: "trial" | "active" | "expired" | "cancelled";
  end_date: string | null;
  days_remaining: number;
  is_valid: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  trial: "Free Trial",
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [months, setMonths] = useState(1);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscription");
      if (res.ok) setSub(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function extend() {
    setExtending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message ?? "Subscription extended!", type: "success" });
        await load();
      } else {
        setMessage({ text: data.error ?? "Failed to extend subscription", type: "error" });
      }
    } finally {
      setExtending(false);
    }
  }

  useEffect(() => { load(); }, []);

  const endDate = sub?.end_date ? new Date(sub.end_date) : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your Labora cloud subscription</p>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
      ) : sub ? (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[sub.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </span>
              </div>
              {sub.is_valid
                ? <CheckCircle2 className="text-green-500 mt-1" size={28} />
                : <AlertCircle className="text-red-500 mt-1" size={28} />
              }
            </div>

            {endDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays size={16} className="text-gray-400" />
                <span>
                  {sub.is_valid ? "Expires on" : "Expired on"}{" "}
                  <strong>
                    {endDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                </span>
              </div>
            )}

            {sub.days_remaining !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className={sub.days_remaining < 0 ? "text-red-400" : "text-gray-400"} />
                <span className={sub.days_remaining < 0 ? "text-red-600 font-medium" : "text-gray-600"}>
                  {sub.days_remaining < 0
                    ? `${Math.abs(sub.days_remaining)} day${Math.abs(sub.days_remaining) !== 1 ? "s" : ""} overdue`
                    : sub.days_remaining === 0
                    ? "Expires today"
                    : `${sub.days_remaining} day${sub.days_remaining !== 1 ? "s" : ""} remaining`
                  }
                </span>
              </div>
            )}
          </div>

          {/* What is locked */}
          {!sub.is_valid && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">Read-only mode is active</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>Cannot register new patients</li>
                <li>Cannot create new orders</li>
                <li>Cannot record payments</li>
                <li>Cannot generate reports</li>
              </ul>
              <p className="pt-1 text-red-700">You can still view all existing data, download reports, and export records.</p>
            </div>
          )}

          {/* Extend subscription (demo / manual mode) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Extend Subscription</h2>
            <p className="text-sm text-gray-500 mb-4">
              In the current plan, subscription is extended manually. Contact your Labora administrator or use the controls below (admin only).
            </p>

            {message && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap">Extend by</label>
              <select
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 6, 12].map(m => (
                  <option key={m} value={m}>{m} month{m !== 1 ? "s" : ""}</option>
                ))}
              </select>
              <button
                onClick={extend}
                disabled={extending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {extending ? "Extending…" : "Extend Subscription"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Tip: You can also update subscription details directly in the Supabase dashboard under the <code className="bg-gray-100 px-1 rounded">tenants</code> table.
            </p>
          </div>

          {/* Pricing note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">Monthly Plan — ₹999/month</p>
            <p>Includes unlimited patients, orders, reports, and up to 10 staff users. To upgrade or get a custom quote, contact <a href="mailto:support@labora.app" className="underline">support@labora.app</a>.</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Could not load subscription data.</p>
      )}
    </div>
  );
}
