import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  variant?: "default" | "strong";
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl",
        variant === "default" ? "glass" : "glass-strong",
        glow && "glow-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
GlassCard.displayName = "GlassCard";

export default GlassCard;
