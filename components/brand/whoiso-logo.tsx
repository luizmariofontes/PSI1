import { useId } from "react";
import { cn } from "@/lib/utils";

interface WhoISOLogoProps {
  className?: string;
  markOnly?: boolean;
  inverse?: boolean;
}

export function WhoISOLogo({
  className,
  markOnly = false,
  inverse = false,
}: WhoISOLogoProps) {
  const id = useId();
  const shieldGradientId = `whoiso-shield-${id}`;
  const accentGradientId = `whoiso-accent-${id}`;
  const textColor = inverse ? "#ffffff" : "#0f172a";
  const subtitleColor = inverse ? "#94a3b8" : "#64748b";

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
          <stop offset="0%" stopColor="#0f172a" stopOpacity="1" />
          <stop offset="100%" stopColor="#334155" stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id={accentGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
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
