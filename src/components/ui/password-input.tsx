"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password field with a built-in show/hide toggle, shared by every
 * password input in the app (login, signup, reset password, ...).
 *
 * The toggle only ever flips the underlying <input>'s `type` attribute —
 * the input never remounts, so the value, selection range, and cursor
 * position all survive a toggle for free (this is the same technique
 * browsers' own built-in password reveal affordance and password manager
 * extensions use, so it doesn't confuse them).
 *
 * Positioning uses Tailwind's logical-property utilities (`end-*`, `pe-*`)
 * instead of a `ltr:`/`rtl:` class pair, so the icon lands on the correct
 * side automatically from the ancestor `dir="rtl"|"ltr"` attribute set in
 * the locale layout — one code path for both directions, not two.
 */
export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Override the wrapper's className (e.g. to adjust width). */
  wrapperClassName?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, disabled, ...props }, ref) => {
    const t = useTranslations("auth");
    const [visible, setVisible] = React.useState(false);

    return (
      <div className={cn("relative", wrapperClassName)}>
        <Input
          type={visible ? "text" : "password"}
          className={cn("pe-10", className)}
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-[calc(var(--radius-brand)-4px)] text-[var(--color-muted-text)] transition-colors hover:text-[var(--color-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
