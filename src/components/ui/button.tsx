import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-brand)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-teal)] text-[var(--color-soft-white)] hover:bg-[var(--color-teal-dark)]",
        secondary:
          "bg-[var(--color-cream)] text-[var(--color-dark-text)] hover:bg-[var(--color-cream)]/80",
        accent:
          "bg-[var(--color-caramel)] text-[var(--color-espresso)] hover:bg-[var(--color-copper)]",
        outline:
          "border border-[var(--color-border,#ece1d3)] bg-transparent text-[var(--color-dark-text)] hover:bg-[var(--color-cream)]",
        ghost: "hover:bg-[var(--color-cream)] text-[var(--color-dark-text)]",
        destructive: "bg-[var(--color-error)] text-white hover:opacity-90",
        link: "text-[var(--color-teal)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[calc(var(--radius-brand)-2px)] px-3",
        lg: "h-12 rounded-[var(--radius-brand)] px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
