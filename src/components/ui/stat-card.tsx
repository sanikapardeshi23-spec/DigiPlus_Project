import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  description,
  className,
}: StatCardProps) {
  const changeColors = {
    positive: "text-emerald-600 bg-emerald-50",
    negative: "text-rose-600 bg-rose-50",
    neutral: "text-slate-600 bg-slate-100",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
              changeColors[changeType]
            )}
          >
            {change}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}
