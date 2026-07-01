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

  useEffect(() => {
    fetch("/api/admin/subscription")
      .then(r => r.ok ? r.json() : null)
      .then(setSub)
      .finally(() => setLoading(false));
  }, []);

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

          {/* How to renew */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">How to Renew</h2>
            <p className="text-sm text-gray-500 mb-3">
              Subscriptions are activated manually after payment confirmation. To renew:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
              <li>Make the payment to your Labora provider</li>
              <li>Contact support with your lab name and payment confirmation</li>
              <li>Access will be restored within 24 hours</li>
            </ol>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Could not load subscription data.</p>
      )}
    </div>
  );
}
