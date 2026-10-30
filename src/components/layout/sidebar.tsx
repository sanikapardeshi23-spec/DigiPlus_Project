"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BookOpen,
  Settings,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/store/workspace-context";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { stats, settings } = useWorkspace();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Meetings",
      href: "/meetings",
      icon: CalendarDays,
      badge: stats.upcomingMeetingsCount > 0 ? stats.upcomingMeetingsCount : null,
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      badge: stats.pendingTasks > 0 ? stats.pendingTasks : null,
      badgeVariant: stats.overdueTasks > 0 ? "danger" : "default",
    },
    {
      name: "Knowledge Base",
      href: "/knowledge",
      icon: BookOpen,
      badge: null,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200 bg-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* App Branding */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs shadow-sky-600/30">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">DigiPlus</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              </div>
              <span className="text-[10.5px] text-slate-400 font-medium tracking-tight">Workspace & Knowledge</span>
            </div>
          </Link>
        </div>

        {/* Workspace Switcher / Badge */}
        <div className="p-3 mx-3 my-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">
              DP
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{settings.workspaceName}</p>
              <p className="text-[10px] text-slate-400 truncate">Claude 3.5 Sonnet</p>
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sky-50/80 text-sky-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      item.badgeVariant === "danger"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : isActive
                        ? "bg-sky-200/70 text-sky-800"
                        : "bg-slate-200/80 text-slate-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-300">
              {settings.userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{settings.userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{settings.userEmail}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
