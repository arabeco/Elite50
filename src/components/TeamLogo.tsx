import React from 'react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { LogoPattern, LogoShape } from '../types';
import { deriveAccentColor, deriveShapeFromSignature } from '../utils/logoUtils';

export interface TeamLogoProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  shapeId?: LogoShape;
  patternId: LogoPattern;
  symbolId: string;
  secondarySymbolId?: string;
  size?: number;
  className?: string;
  showCircle?: boolean;
}

const LEGACY_PATTERN_MAP: Record<string, LogoPattern> = {
  none: 'solid',
  'stripes-v': 'stripes_vertical',
  'stripes-h': 'stripes_horizontal',
  diagonal: 'diagonal_split',
  sunburst: 'radial',
};

const getShapePath = (shapeId: LogoShape) => {
  switch (shapeId) {
    case 'shield_modern':
      return 'M16 10 H84 V58 C84 78 67 90 50 96 C33 90 16 78 16 58 Z';
    case 'circle_badge':
      return 'M50 7 A43 43 0 1 1 49.9 7 Z';
    case 'hex_tech':
      return 'M28 10 H72 L90 28 V72 L72 90 H28 L10 72 V28 Z';
    case 'diamond':
      return 'M50 6 L92 50 L50 94 L8 50 Z';
    case 'shield_classic':
    default:
      return 'M14 10 H86 V56 C86 79 69 91 50 97 C31 91 14 79 14 56 Z';
  }
};

const getInnerShapePath = (shapeId: LogoShape) => {
  switch (shapeId) {
    case 'shield_modern':
      return 'M21 16 H79 V56 C79 72 65 82 50 88 C35 82 21 72 21 56 Z';
    case 'circle_badge':
      return 'M50 16 A34 34 0 1 1 49.9 16 Z';
    case 'hex_tech':
      return 'M31 18 H69 L82 31 V69 L69 82 H31 L18 69 V31 Z';
    case 'diamond':
      return 'M50 18 L82 50 L50 82 L18 50 Z';
    case 'shield_classic':
    default:
      return 'M20 16 H80 V54 C80 70 66 81 50 87 C34 81 20 70 20 54 Z';
  }
};

const renderPattern = (patternId: LogoPattern, secondaryColor: string, accentColor: string) => {
  const normalizedPattern = LEGACY_PATTERN_MAP[patternId] || patternId;

  switch (normalizedPattern) {
    case 'stripes_vertical':
      return (
        <>
          <rect x="16" y="0" width="16" height="100" fill={secondaryColor} fillOpacity="0.88" />
          <rect x="42" y="0" width="16" height="100" fill={accentColor} fillOpacity="0.75" />
          <rect x="68" y="0" width="16" height="100" fill={secondaryColor} fillOpacity="0.88" />
        </>
      );
    case 'stripes_horizontal':
      return (
        <>
          <rect x="0" y="18" width="100" height="16" fill={secondaryColor} fillOpacity="0.88" />
          <rect x="0" y="42" width="100" height="16" fill={accentColor} fillOpacity="0.75" />
          <rect x="0" y="66" width="100" height="16" fill={secondaryColor} fillOpacity="0.88" />
        </>
      );
    case 'diagonal_split':
      return (
        <>
          <path d="M0 0 H100 V100 Z" fill={secondaryColor} fillOpacity="0.86" />
          <path d="M-4 78 L78 -4 L104 22 L22 104 Z" fill={accentColor} fillOpacity="0.75" />
        </>
      );
    case 'radial':
      return (
        <>
          <circle cx="50" cy="50" r="18" fill={accentColor} fillOpacity="0.26" />
          <g fill={secondaryColor} fillOpacity="0.82">
            {[0, 30, 60, 90, 120, 150].map(angle => (
              <rect
                key={angle}
                x="47"
                y="-4"
                width="6"
                height="54"
                rx="2"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
          </g>
        </>
      );
    case 'solid':
    default:
      return <rect x="0" y="0" width="100" height="100" fill={accentColor} fillOpacity="0.16" />;
  }
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  primaryColor,
  secondaryColor,
  accentColor,
  shapeId,
  patternId,
  symbolId,
  secondarySymbolId,
  size = 40,
  className = '',
  showCircle = true
}) => {
  const SymbolIcon = ((Icons as any)[symbolId] as LucideIcon) || Icons.Shield;
  const SecondarySymbolIcon = secondarySymbolId ? ((Icons as any)[secondarySymbolId] as LucideIcon) : null;
  const id = React.useId().replace(/:/g, '');
  const resolvedAccent = accentColor || deriveAccentColor(primaryColor, secondaryColor);
  const resolvedShape = shapeId || deriveShapeFromSignature(`${primaryColor}-${secondaryColor}-${patternId}-${symbolId}-${secondarySymbolId || 'solo'}`);
  const outerPath = getShapePath(resolvedShape);
  const innerPath = getInnerShapePath(resolvedShape);
  const borderColor = deriveAccentColor(resolvedAccent, '#ffffff');
  const isRoundShape = resolvedShape === 'circle_badge';

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.42)]"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="62%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>

          <linearGradient id={`shine-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.20" />
          </linearGradient>

          <clipPath id={`clip-${id}`}>
            <path d={innerPath} />
          </clipPath>
        </defs>

        <path d={outerPath} fill="black" fillOpacity="0.24" transform="translate(0, 2)" />

        <path
          d={outerPath}
          fill={borderColor}
          fillOpacity="0.95"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.8"
        />

        <path
          d={innerPath}
          fill={`url(#grad-${id})`}
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="1.4"
        />

        <g clipPath={`url(#clip-${id})`}>
          {renderPattern(patternId, secondaryColor, resolvedAccent)}
          <path
            d="M10 10 H90 V34 C76 42 60 46 50 46 C40 46 24 42 10 34 Z"
            fill={`url(#shine-${id})`}
            fillOpacity="0.68"
          />
        </g>

        <path
          d={innerPath}
          fill="none"
          stroke="rgba(0,0,0,0.20)"
          strokeWidth="2"
        />

        <path
          d={innerPath}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.9"
        />

        {showCircle && (
          <g>
            <circle
              cx="50"
              cy={isRoundShape ? 50 : 47}
              r={isRoundShape ? 24 : 22}
              fill="rgba(4,8,18,0.56)"
              stroke={resolvedAccent}
              strokeWidth="2.2"
              strokeOpacity="0.82"
            />
            <circle
              cx="50"
              cy={isRoundShape ? 50 : 47}
              r={isRoundShape ? 19 : 17}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.20)"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ paddingTop: showCircle && !isRoundShape ? '2%' : '0' }}
      >
        {!SecondarySymbolIcon ? (
          <SymbolIcon
            size={size * (showCircle ? 0.34 : 0.42)}
            className="text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]"
            strokeWidth={2.5}
          />
        ) : (
          <div className="flex gap-0.5">
            <SymbolIcon
              size={size * 0.26}
              className="text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]"
              strokeWidth={2.5}
            />
            <SecondarySymbolIcon
              size={size * 0.24}
              className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]"
              style={{ color: resolvedAccent }}
              strokeWidth={2.5}
            />
          </div>
        )}
      </div>
    </div>
  );
};
