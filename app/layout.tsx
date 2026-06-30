import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Labora — Lab Intelligence Platform",
  description: "Digital lab management for pathology labs in India",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = process.env.STORAGE_MODE ?? "cloud";
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="storage-mode" content={mode} />
      </head>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
