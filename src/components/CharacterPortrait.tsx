import React from 'react';
import type { CharacterId } from '../types/game';
import { getCharacterProfile } from '../game/rules';

interface CharacterPortraitProps {
  characterId: CharacterId;
  className?: string;
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  characterId,
  className = 'w-14 h-14',
}) => {
  const profile = getCharacterProfile(characterId);
  const { primary, secondary, accent, skin, hair } = profile.colors;

  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      role="img"
      aria-label={`${profile.codename} portrait`}
    >
      <defs>
        <linearGradient id={`bg-${characterId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#141822" />
          <stop offset="100%" stopColor="#08090d" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" fill={`url(#bg-${characterId})`} />
      <rect x="1.5" y="1.5" width="77" height="77" fill="none" stroke="#2f3542" strokeWidth="1.5" />

      {/* Back Hair for Hoa / Phuong */}
      {characterId === 'phuong' && (
        <path d="M21 30 C19 48, 22 60, 26 62 L54 62 C58 60, 61 48, 59 30 Z" fill={hair} />
      )}
      {characterId === 'hoa' && (
        <path d="M23 30 C21 44, 24 53, 27 55 L53 55 C56 53, 59 44, 57 30 Z" fill={hair} />
      )}

      {/* Shoulders & Outfit */}
      <path
        d={
          characterId === 'ty'
            ? 'M10 80 C12 60, 22 54, 40 54 C58 54, 68 60, 70 80 Z'
            : 'M15 80 C17 61, 25 56, 40 56 C55 56, 63 61, 65 80 Z'
        }
        fill={primary}
      />

      {/* Character-specific Outfit Details */}
      {characterId === 'ty' && (
        <>
          <path d="M31 54 L40 69 L49 54 Z" fill={secondary} />
          <circle cx="52" cy="66" r="2.2" fill={accent} />
        </>
      )}
      {characterId === 'nam' && (
        <>
          <path d="M33 56 L40 74 L47 56 Z" fill={secondary} />
          <path d="M38.5 58 L41.5 58 L41 72 L39 72 Z" fill={hair} />
        </>
      )}
      {characterId === 'hoa' && (
        <>
          <path d="M33 56 L40 66 L47 56 Z" fill={secondary} />
          <path d="M24 59 L54 80 L48 80 L21 63 Z" fill={accent} />
        </>
      )}
      {characterId === 'hai' && (
        <>
          <rect x="17" y="64" width="46" height="4" fill={accent} />
          <path d="M34 56 L40 64 L46 56 Z" fill={secondary} />
        </>
      )}
      {characterId === 'phuong' && (
        <path d="M32 56 L40 72 L48 56 Z" fill={secondary} />
      )}

      {/* Neck & Head */}
      <rect x="35" y="45" width="10" height="12" rx="3" fill={skin} />
      <ellipse
        cx="40"
        cy="34"
        rx={characterId === 'ty' ? 16 : 13.5}
        ry={characterId === 'ty' ? 16.5 : 16}
        fill={skin}
      />

      {/* Eyes & Brows */}
      <rect x="31" y="32" width="4.5" height="3" rx="1" fill="#18181b" />
      <rect x="44.5" y="32" width="4.5" height="3" rx="1" fill="#18181b" />
      <path d="M30 29 L36 29.5" stroke={hair} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M44 29.5 L50 29" stroke={hair} strokeWidth="1.8" strokeLinecap="round" />

      {/* Mouth Expression */}
      {characterId === 'phuong' ? (
        <path d="M35 42 Q40 45 45 41.5" fill="none" stroke="#6b3d38" strokeWidth="1.6" strokeLinecap="round" />
      ) : characterId === 'nam' ? (
        <path d="M36 43 Q40 41 44 43" fill="none" stroke="#6b443e" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <line x1="36" y1="42.5" x2="44" y2="42.5" stroke="#6b443e" strokeWidth="1.5" strokeLinecap="round" />
      )}

      {/* Top Hair */}
      <path
        d={
          characterId === 'hai'
            ? 'M26 29 C26 16, 54 15, 54 29 C50 22, 31 21, 26 29 Z'
            : 'M25 31 C25 16, 55 16, 55 31 C50 24, 30 23, 25 31 Z'
        }
        fill={hair}
      />

      {/* Nam's Glasses */}
      {characterId === 'nam' && (
        <g stroke={accent} strokeWidth="1.6" fill="rgba(220,235,245,0.12)">
          <rect x="28.5" y="29.5" width="9.5" height="7" rx="1.2" />
          <rect x="42" y="29.5" width="9.5" height="7" rx="1.2" />
          <line x1="38" y1="33" x2="42" y2="33" />
        </g>
      )}

      {/* Phuong's Brass Hair Clip */}
      {characterId === 'phuong' && (
        <rect x="47" y="22" width="6.5" height="2.4" rx="1" fill={accent} transform="rotate(-15 50 23)" />
      )}
    </svg>
  );
};
