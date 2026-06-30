"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ChevronRight } from "lucide-react";

interface Props { orderId: string; nextStatus: string; }

export function StatusAdvanceButton({ orderId, nextStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function advance() {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      toast(`Status updated to ${nextStatus}`, "success");
      router.refresh();
    } else {
      const d = await res.json();
      toast(d.error ?? "Update failed", "error");
    }
    setLoading(false);
  }

  const labels: Record<string, string> = {
    collected: "Mark Collected",
    processing: "Start Processing",
    completed: "Mark Completed",
  };

  return (
    <Button onClick={advance} loading={loading} variant="outline">
      <ChevronRight className="mr-2 h-4 w-4" />
      {labels[nextStatus] ?? `Move to ${nextStatus}`}
    </Button>
  );
}
