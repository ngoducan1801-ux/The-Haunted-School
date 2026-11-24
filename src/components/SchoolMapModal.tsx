import React, { useMemo, useState } from 'react';
import { getUiStrings } from '../game/i18n';
import { SCHOOL_FLOOR_PLANS, type BlueprintRoom } from '../game/schoolWorld';
import type { LanguageCode, NetworkPlayerState } from '../types/game';

interface SchoolMapModalProps {
  language: LanguageCode;
  currentFloor: number;
  playerPos: { x: number; y: number; z: number; yaw: number };
  teammates?: NetworkPlayerState[];
  localPlayerId?: string | null;
  zoneName: string;
  objectiveText: string;
  onClose: () => void;
}

const ROOM_STYLE_MAP: Record<
  BlueprintRoom['kind'],
  { fill: string; stroke: string; text: string }
> = {
  room: { fill: '#121826', stroke: '#334155', text: '#cbd5e1' },
  corridor: { fill: '#1a202c', stroke: '#475569', text: '#94a3b8' },
  restroom: { fill: '#122429', stroke: '#0e7490', text: '#67e8f9' },
  stairs: { fill: '#2a1f10', stroke: '#d97706', text: '#fcd34d' },
  gate: { fill: '#2c1215', stroke: '#dc2626', text: '#fca5a5' },
  parking: { fill: '#14171f', stroke: '#52525b', text: '#a1a1aa' },
  secret: { fill: '#22142b', stroke: '#9333ea', text: '#e9d5ff' },
};

// Map world coordinates x in [-28, 28], z in [-36, 58] into SVG viewBox (0..560, 0..720)
function worldToSvgX(x: number): number {
  return ((x + 28) / 56) * 520 + 20;
}

function worldToSvgY(z: number): number {
  return ((z + 36) / 94) * 680 + 20;
}

function worldWToSvg(w: number): number {
  return (w / 56) * 520;
}

function worldDToSvg(d: number): number {
  return (d / 94) * 680;
}

function elevationToFloorId(y: number): number {
  if (y < -2.2) return -1;
  if (y >= 22.0) return 7;
  return Math.max(1, Math.min(6, Math.round(y / 4) + 1));
}

export const SchoolMapModal: React.FC<SchoolMapModalProps> = ({
  language,
  currentFloor,
  playerPos,
  teammates = [],
  localPlayerId,
  zoneName,
  objectiveText,
  onClose,
}) => {
  const t = getUiStrings(language);
  const [viewedFloor, setViewedFloor] = useState<number>(currentFloor);

  const floorPlan = useMemo(
    () => SCHOOL_FLOOR_PLANS.find((f) => f.floorId === viewedFloor) ?? SCHOOL_FLOOR_PLANS[1],
    [viewedFloor]
  );

  const playerSvgX = worldToSvgX(playerPos.x);
  const playerSvgY = worldToSvgY(playerPos.z);
  const playerHeadingDeg = (-playerPos.yaw * 180) / Math.PI + 180;

  const visibleTeammates = teammates.filter(
    (p) =>
      p.connected &&
      p.playerId !== localPlayerId &&
      p.characterId !== null &&
      elevationToFloorId(p.position.y) === viewedFloor
  );

  return (
    <div
      data-testid="school-map-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#040508]/92 p-3 md:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-5xl bg-[#090c12] border border-zinc-700 text-zinc-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-zinc-800 bg-[#07090d]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
              {t.map.subtitle}
            </div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-zinc-100">
              {t.map.title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-map-btn"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-wider text-zinc-200"
          >
            {t.map.close}
          </button>
        </div>

        {/* Body: Floor Selector Tabs + Interactive Blueprint */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Sidebar: Floor Tabs, Zone Info & Legend */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-zinc-800 p-3.5 md:p-4 flex flex-col justify-between gap-3 overflow-y-auto bg-[#07090e]">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 mb-2">
                {t.map.floors}
              </div>
              <div className="grid grid-cols-4 md:grid-cols-2 gap-1.5">
                {SCHOOL_FLOOR_PLANS.map((fl) => {
                  const isActive = fl.floorId === viewedFloor;
                  const isPlayerHere = fl.floorId === currentFloor;
                  return (
                    <button
                      key={fl.floorId}
                      type="button"
                      data-testid={`map-floor-btn-${fl.code}`}
                      onClick={() => setViewedFloor(fl.floorId)}
                      className={`px-2.5 py-2 border text-left text-xs font-mono flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-[#7f1d1d] border-[#dc2626] text-white font-semibold'
                          : 'bg-[#0e121b] border-zinc-800 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      <span>{t.hud.floorLabels[fl.floorId] ?? fl.code}</span>
                      {isPlayerHere && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-400"
                          title={t.map.legendYou}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                {language === 'vi' ? floorPlan.nameVi : floorPlan.nameEn}
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed">{zoneName}</div>
              <div className="text-[11px] text-zinc-400 leading-relaxed border-l-2 border-[#dc2626] pl-2.5">
                {objectiveText}
              </div>
            </div>

            {/* Map Legend */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>{t.map.legendYou}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span>{t.map.legendTeammate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#2a1f10] border border-[#d97706] inline-block" />
                <span>{t.map.legendStairs}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#122429] border border-[#0e7490] inline-block" />
                <span>{t.map.legendRestroom}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#2c1215] border border-[#dc2626] inline-block" />
                <span>{t.map.legendGate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#14171f] border border-[#52525b] inline-block" />
                <span>{t.map.legendParking}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#22142b] border border-[#9333ea] inline-block" />
                <span>{language === 'vi' ? 'Khu Bí Mật' : 'Secret Room'}</span>
              </div>
            </div>
          </div>

          {/* 2D Blueprint Canvas */}
          <div className="md:col-span-8 bg-[#05070c] p-3 md:p-5 flex items-center justify-center overflow-auto">
            <svg
              viewBox="0 0 560 720"
              className="w-full max-w-[460px] h-auto max-h-[68vh] border border-zinc-800 bg-[#070a10]"
              role="img"
              aria-label={t.map.title}
            >
              {/* Subtle Architectural Grid */}
              <defs>
                <pattern id="bpGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect x="0" y="0" width="560" height="720" fill="url(#bpGrid)" />

              {/* Wing Guidance Labels */}
              <text
                x="110"
                y="22"
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {t.map.northWing.toUpperCase()}
              </text>
              <text
                x="280"
                y="22"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {floorPlan.code} ({floorPlan.elevationY >= 0 ? `+${floorPlan.elevationY}m` : `${floorPlan.elevationY}m`})
              </text>
              <text
                x="62"
                y="340"
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="monospace"
                transform="rotate(-90 62 340)"
              >
                {t.map.westWing.toUpperCase()}
              </text>
              <text
                x="505"
                y="340"
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="monospace"
                transform="rotate(90 505 340)"
              >
                {t.map.eastWing.toUpperCase()}
              </text>

              {/* Rooms & Corridors */}
              {floorPlan.rooms.map((rm) => {
                const palette = ROOM_STYLE_MAP[rm.kind];
                const sx = worldToSvgX(rm.x - rm.w / 2);
                const sy = worldToSvgY(rm.z - rm.d / 2);
                const sw = worldWToSvg(rm.w);
                const sh = worldDToSvg(rm.d);
                const label = language === 'vi' ? rm.labelVi : rm.labelEn;
                const isNarrowTall = sh > sw * 1.55 && sw < 52;
                const cx = sx + sw / 2;
                const cy = sy + sh / 2;
                const fontSize = isNarrowTall ? 6.2 : sw < 42 ? 5.6 : sw < 68 ? 6.4 : sw < 100 ? 7.2 : 8.5;
                const maxChars = isNarrowTall ? 18 : sw < 42 ? 12 : sw < 75 ? 16 : 24;
                const display = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
                return (
                  <g key={rm.id}>
                    <rect
                      x={sx}
                      y={sy}
                      width={sw}
                      height={sh}
                      fill={palette.fill}
                      stroke={palette.stroke}
                      strokeWidth="1.4"
                    />
                    <text
                      x={cx}
                      y={cy + 2.5}
                      textAnchor="middle"
                      fill={palette.text}
                      fontSize={fontSize}
                      fontFamily="monospace"
                      transform={isNarrowTall ? `rotate(-90 ${cx} ${cy})` : undefined}
                    >
                      {display}
                    </text>
                  </g>
                );
              })}

              {/* Teammate Pins on Viewed Floor */}
              {visibleTeammates.map((tm) => {
                const tx = worldToSvgX(tm.position.x);
                const ty = worldToSvgY(tm.position.z);
                return (
                  <g key={tm.playerId}>
                    <circle
                      cx={tx}
                      cy={ty}
                      r="6"
                      fill={tm.isDowned ? '#ef4444' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <text
                      x={tx}
                      y={ty - 9}
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {tm.displayName.slice(0, 8)}
                    </text>
                  </g>
                );
              })}

              {/* Local Player Directional Pin */}
              {viewedFloor === currentFloor && (
                <g transform={`translate(${playerSvgX}, ${playerSvgY}) rotate(${playerHeadingDeg})`}>
                  <circle cx="0" cy="0" r="11" fill="rgba(16,185,129,0.22)" />
                  <polygon
                    points="0,-9 6.5,7 0,3.5 -6.5,7"
                    fill="#34d399"
                    stroke="#064e3b"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
