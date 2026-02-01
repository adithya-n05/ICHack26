import type { ReactNode } from 'react';

interface GlowingBorderProps {
  children: ReactNode;
  color?: 'cyan' | 'amber' | 'red' | 'green' | 'purple';
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
  className?: string;
}

const colorMap = {
  cyan: {
    gradient: 'from-cyan-500 via-cyan-400 to-cyan-500',
    shadow: 'shadow-cyan-500/30',
  },
  amber: {
    gradient: 'from-amber-500 via-amber-400 to-amber-500',
    shadow: 'shadow-amber-500/30',
  },
  red: {
    gradient: 'from-red-500 via-red-400 to-red-500',
    shadow: 'shadow-red-500/30',
  },
  green: {
    gradient: 'from-green-500 via-green-400 to-green-500',
    shadow: 'shadow-green-500/30',
  },
  purple: {
    gradient: 'from-purple-500 via-purple-400 to-purple-500',
    shadow: 'shadow-purple-500/30',
  },
};

const intensityMap = {
  low: 'opacity-30',
  medium: 'opacity-50',
  high: 'opacity-70',
};

export function GlowingBorder({
  children,
  color = 'cyan',
  intensity = 'medium',
  animated = false,
  className = '',
}: GlowingBorderProps) {
  const { gradient, shadow } = colorMap[color];

  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div
        className={`absolute -inset-[1px] rounded-lg bg-gradient-to-r ${gradient} blur-sm ${intensityMap[intensity]} ${animated ? 'animate-pulse' : ''}`}
      />
      {/* Border */}
      <div
        className={`absolute -inset-[1px] rounded-lg bg-gradient-to-r ${gradient} opacity-60`}
      />
      {/* Content */}
      <div className={`relative rounded-lg ${shadow} shadow-lg`}>{children}</div>
    </div>
  );
}
