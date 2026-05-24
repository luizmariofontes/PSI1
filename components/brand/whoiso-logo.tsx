import { useId } from "react";
import { cn } from "@/lib/utils";

interface WhoISOLogoProps {
  className?: string;
  markOnly?: boolean;
  inverse?: boolean;
  mode?: "light" | "dark";
}

export function WhoISOLogo({
  className,
  markOnly = false,
  inverse = false,
  mode = "light",
}: WhoISOLogoProps) {
  const id = useId();
  const shieldGradientId = `whoiso-shield-${id}`;
  const accentGradientId = `whoiso-accent-${id}`;
  const textColor = inverse ? "#ffffff" : "#0f172a";
  const subtitleColor = inverse ? "#94a3b8" : "#64748b";
  const shieldStartColor = mode === "dark" ? "#f8fafc" : "#0f172a";
  const shieldEndColor = mode === "dark" ? "#cbd5e1" : "#334155";
  const accentStartColor = mode === "dark" ? "#60a5fa" : "#3b82f6";
  const accentEndColor = mode === "dark" ? "#22d3ee" : "#06b6d4";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={markOnly ? "0 0 90 100" : "0 0 350 100"}
      aria-label="WhoISO"
      role="img"
      className={cn("h-auto", markOnly ? "w-10" : "w-44", className)}
    >
      <defs>
        <linearGradient
          id={shieldGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={shieldStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={shieldEndColor} stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id={accentGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={accentStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={accentEndColor} stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M45 15 L75 25 V55 C75 75 45 90 45 90 C45 90 15 75 15 55 V25 Z"
        fill={`url(#${shieldGradientId})`}
      />
      <line
        x1="61"
        y1="56"
        x2="70"
        y2="65"
        stroke={`url(#${accentGradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="45"
        r="14"
        fill="none"
        stroke={`url(#${accentGradientId})`}
        strokeWidth="4"
      />
      {!markOnly && (
        <>
          <text
            x="100"
            y="65"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="44"
            fill={textColor}
            letterSpacing="-1"
          >
            Who<tspan fill={`url(#${accentGradientId})`}>ISO</tspan>
          </text>
          <text
            x="104"
            y="85"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="500"
            fontSize="12"
            fill={subtitleColor}
            letterSpacing="2"
          >
            AUDITORIA LTDA
          </text>
        </>
      )}
    </svg>
  );
}
