import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-cream)] text-[var(--color-dark-text)]",
        teal: "border-transparent bg-[var(--color-teal)]/10 text-[var(--color-teal)]",
        accent: "border-transparent bg-[var(--color-caramel)]/15 text-[var(--color-copper)]",
        outline: "border-[var(--color-border,#ece1d3)] text-[var(--color-muted-text)]",
        warning: "border-transparent bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
