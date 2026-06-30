import { Cloud, HardDrive } from "lucide-react";

interface ModeBadgeProps {
  mode: "cloud" | "local";
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0
      ${mode === "local"
        ? "bg-red-50 text-red-600 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
      }`}>
      {mode === "local" ? <HardDrive className="h-2.5 w-2.5" /> : <Cloud className="h-2.5 w-2.5" />}
      <span>{mode === "local" ? "Local" : "Cloud"}</span>
    </div>
  );
}
