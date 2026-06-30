"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, FlaskConical, FileText, Receipt,
  Stethoscope, Settings, LogOut, ChevronRight, Beaker, Zap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { ModeBadge } from "./mode-badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { label: "Home", href: "/home", icon: LayoutDashboard, roles: ["staff", "technician", "pathologist"] },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Orders", href: "/orders", icon: Beaker },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Billing", href: "/billing", icon: Receipt, roles: ["admin", "staff"] },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, roles: ["admin", "staff"] },
  { label: "Audit Log", href: "/audit", icon: Shield, roles: ["admin"] },
  {
    label: "Settings", href: "/settings/lab", icon: Settings, roles: ["admin"],
    children: [
      { label: "Lab Profile", href: "/settings/lab", icon: Settings },
      { label: "Test Catalog", href: "/settings/tests", icon: FlaskConical },
      { label: "Users", href: "/settings/users", icon: Users },
    ]
  },
];

interface SidebarProps {
  role: UserRole;
  tenantName: string;
  userName: string;
  mode?: "cloud" | "local";
}

export function Sidebar({ role, tenantName, userName, mode = "cloud" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));

  return (
    <div className="flex h-full flex-col w-64 shrink-0 bg-white border-r border-gray-200">

      {/* Logo / Brand */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{tenantName}</p>
            <p className="text-xs text-red-600 font-semibold tracking-wide">LABORA</p>
          </div>
          <ModeBadge mode={mode} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {visibleItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          if (item.children) {
            const childActive = item.children.some(c => pathname.startsWith(c.href));
            return (
              <div key={item.href} className="mb-0.5">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-default",
                  childActive ? "text-red-600" : "text-gray-500"
                )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", childActive && "rotate-90")} />
                </div>
                <div className="ml-3 pl-3 mt-0.5 space-y-0.5 border-l border-gray-200">
                  {item.children.map(child => {
                    const cActive = pathname.startsWith(child.href);
                    const CIcon = child.icon;
                    return (
                      <Link key={child.href} href={child.href}>
                        <div className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          cActive
                            ? "bg-red-50 text-red-700 font-semibold"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}>
                          <CIcon className="h-3.5 w-3.5 shrink-0" />
                          {child.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
