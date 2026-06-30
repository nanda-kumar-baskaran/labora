"use client"
import * as React from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, type?: ToastType) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl text-sm font-medium min-w-[280px] pointer-events-auto border backdrop-blur-xl",
              "animate-in",
              t.type === "success" && "bg-emerald-500/20 text-emerald-200 border-emerald-500/30 shadow-emerald-500/10",
              t.type === "error" && "bg-red-500/20 text-red-200 border-red-500/30 shadow-red-500/10",
              t.type === "info" && "bg-slate-800/90 text-slate-200 border-white/10",
            )}
            style={{ backdropFilter: "blur(20px)" }}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 text-blue-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
