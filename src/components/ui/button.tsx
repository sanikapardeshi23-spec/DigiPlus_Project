import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantClasses = {
      primary:
        "bg-sky-600 hover:bg-sky-700 text-white shadow-xs focus-visible:ring-sky-500 active:scale-[0.98]",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 focus-visible:ring-slate-400 active:scale-[0.98]",
      outline:
        "border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 active:scale-[0.98]",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-500 active:scale-[0.98]",
      link:
        "text-sky-600 hover:text-sky-700 underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
