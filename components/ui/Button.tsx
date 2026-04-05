import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { ButtonVariant, ButtonSize } from "@/types";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white border-transparent",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 border-transparent",
  outline: "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700 border-transparent",
  danger: "bg-red-600 hover:bg-red-700 text-white border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-lg border transition-colors",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Chargement…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
