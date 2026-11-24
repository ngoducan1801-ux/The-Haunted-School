import React, { useEffect, useState } from 'react';
import {
  getUiStrings,
  localizeItem,
  localizeNote,
  localizeNpcDialogue,
} from '../game/i18n';
import type { GameSettings, HudSnapshot, NpcDialogueOption } from '../types/game';
import { PuzzleModal } from './PuzzleModal';

interface GameHUDProps {
  hud: HudSnapshot;
  settings: GameSettings;
  isTouchMode?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenMap: () => void;
  onSelectQuickSlot: (index: number) => void;
  onUseQuickSlot: (index: number) => void;
  onDropSlot: () => void;
  onCloseNote: () => void;
  onCloseNpcDialogue: () => void;
  onSelectNpcOption: (option: NpcDialogueOption) => void;
  onSubmitPuzzle: (puzzleId: string, answer: string) => boolean;
  onClosePuzzle: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  settings,
  isTouchMode = false,
  onToggleMute,
  onPause,
  onOpenMap,
  onSelectQuickSlot,
  onUseQuickSlot,
  onDropSlot,
  onCloseNote,
  onCloseNpcDialogue,
  onSelectNpcOption,
  onSubmitPuzzle,
  onClosePuzzle,
}) => {
  const lang = settings.language;
  const t = getUiStrings(lang);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const batteryPct = Math.max(0, Math.min(100, hud.battery));
  const noisePct = Math.max(4, Math.min(100, Math.round(hud.playerNoiseLevel * 100)));
  const [selectedNpcOption, setSelectedNpcOption] = useState<NpcDialogueOption | null>(null);
  const [objectivesCollapsed, setObjectivesCollapsed] = useState(
    () => isTouchMode || (typeof window !== 'undefined' && window.innerHeight < 520)
  );

  useEffect(() => {
    setSelectedNpcOption(null);
  }, [hud.activeNpcDialogue?.npcId]);

  const modalOpen = Boolean(hud.activeNote || hud.activeNpcDialogue || hud.activePuzzle);
  const vignetteOpacity = Math.min(
    0.72,
    hud.distortionIntensity * 0.52 + (hud.jumpScareActive ? 0.24 : 0) + (hud.hp <= 300 ? 0.16 : 0)
  );

  const floorBadge = t.hud.floorLabels[hud.currentFloor] ?? 'F1';
  const activeNote = hud.activeNote ? localizeNote(hud.activeNote, lang) : null;
  const activeNpc = hud.activeNpcDialogue
    ? localizeNpcDialogue(hud.activeNpcDialogue, lang)
    : null;
  const selectedSlot = hud.quickSlots[hud.selectedSlotIndex] ?? null;
  const canUseSelected = Boolean(
    selectedSlot && (selectedSlot.item.kind === 'healing' || selectedSlot.item.kind === 'battery')
  );
  const canDropSelected = Boolean(selectedSlot && selectedSlot.item.droppable);

  return (
    <div
      data-testid="game-hud"
      className="fixed inset-0 z-10 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 md:p-6"
    >
      {/* Peripheral Horror Distortion Vignette (no backdrop-filter) */}
      {vignetteOpacity > 0.04 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: vignetteOpacity,
            background: hud.jumpScareActive
              ? 'radial-gradient(circle at center, transparent 42%, rgba(127, 29, 29, 0.58) 100%)'
              : 'radial-gradient(circle at center, transparent 52%, rgba(12, 4, 6, 0.72) 100%)',
          }}
        />
      )}

      {/* Brief Red Damage Flash Overlay on -100 HP Strike */}
      {hud.damageFlashActive && (
        <div
          aria-hidden="true"
          data-testid="damage-flash-overlay"
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(185,28,28,0.08) 38%, rgba(220,38,38,0.68) 100%)',
          }}
        />
      )}

      {/* Top Row: Objective/Floor (Left) + Map, Mute & Pause (Right) */}
      <div className="flex items-start justify-between gap-3">
        <div
          className={`bg-[#07090d]/84 border-l-2 border-[#991b1b] px-2.5 sm:px-3 py-1.5 sm:py-2 ${
            isTouchMode ? 'max-w-[238px]' : 'max-w-[238px] sm:max-w-[265px] lg:max-w-md'
          }`}
        >
          <div className="flex items-center flex-wrap gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-400">
            <span className="px-1.5 py-0.5 bg-[#7f1d1d] text-white font-semibold tabular-nums">
              {floorBadge}
            </span>
            <span className="text-[#ef4444] font-semibold tabular-nums">
              {t.hud.lvlShort} {String(hud.level).padStart(2, '0')}
            </span>
            {!isTouchMode && (
              <span className="text-amber-300/80 hidden sm:inline">[{hud.difficultyLabel}]</span>
            )}
            <span>·</span>
            <span className="truncate max-w-[130px] sm:max-w-none text-zinc-200">
              {hud.zoneName}
            </span>
            {!isTouchMode && <span className="hidden sm:inline">·</span>}
            {!isTouchMode && (
              <span className="tabular-nums text-zinc-500 hidden sm:inline">
                {formatTimer(hud.elapsedSeconds)}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2 mt-1">
            <p
              className={`text-[11px] sm:text-xs text-zinc-200 leading-snug ${
                objectivesCollapsed ? 'line-clamp-1' : 'line-clamp-2'
              }`}
            >
              {hud.objectiveText}
            </p>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setObjectivesCollapsed((v) => !v)}
              className="pointer-events-auto text-[10px] font-mono text-zinc-400 hover:text-zinc-200 px-1 shrink-0"
              aria-label="Toggle objectives"
            >
              {objectivesCollapsed ? '▾' : '▴'}
            </button>
          </div>

          {!objectivesCollapsed && hud.objectives.length > 0 && (
            <div
              className="mt-1.5 space-y-0.5 border-t border-zinc-800/80 pt-1 hidden sm:block"
              data-testid="hud-objectives"
            >
              {hud.objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`text-[10px] font-mono flex items-center gap-1.5 ${
                    obj.completed ? 'text-emerald-400 line-through opacity-75' : 'text-zinc-300'
                  }`}
                >
                  <span>{obj.completed ? '✓' : '○'}</span>
                  <span>{obj.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {settings.showFps && (
            <div
              data-testid="hud-perf-stats"
              className="hidden md:flex px-2.5 py-1.5 bg-[#07090d]/85 border border-zinc-800 text-[11px] font-mono tabular-nums text-emerald-400 items-center gap-2"
            >
              <span>{hud.fps} FPS</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300">
                DC {hud.perfStats.drawCalls} · L {hud.perfStats.activeLights}/
                {hud.perfStats.totalLights}
              </span>
            </div>
          )}

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-map-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMap();
            }}
            className="h-8 sm:h-9 px-2.5 sm:px-3 bg-[#07090d]/85 hover:bg-[#141820] border border-zinc-700/80 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5"
            title={t.hud.mapBtn}
          >
            <span>{t.hud.mapBtn}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-[#07090d]/85 hover:bg-[#141820] border border-zinc-700/80 flex items-center justify-center text-zinc-200"
            title="Toggle Mute [M]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              {settings.muted ? (
                <path d="M23 9l-6 6M17 9l6 6" />
              ) : (
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-[#07090d]/85 hover:bg-[#141820] border border-zinc-700/80 flex items-center justify-center text-zinc-200"
            title="Pause [Esc / P]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Monster Chase Alert Banner, Low-HP Alert & Transient Status Banners */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 pointer-events-none w-max ${
          isTouchMode
            ? 'top-2.5 max-w-[240px]'
            : 'top-2.5 max-w-[240px] sm:max-w-[270px] lg:top-4 lg:max-w-[400px]'
        }`}
      >
        {hud.isChased && (
          <div
            data-testid="chase-alert-banner"
            className="px-4 py-1 bg-[#7f1d1d]/92 border border-[#ef4444] text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold"
          >
            {t.hud.chaseAlert}
          </div>
        )}
        {hud.isDowned && (
          <div
            data-testid="downed-status-banner"
            className="px-4 py-1.5 bg-[#2a090d]/95 border border-red-500 text-xs font-mono uppercase tracking-[0.14em] text-red-100 font-semibold"
          >
            {t.hud.downedStatus}
          </div>
        )}
        {!hud.isDowned && hud.hp <= 300 && (
          <div
            data-testid="low-hp-banner"
            className="px-3.5 py-0.5 bg-[#240b0e]/90 border border-red-700 text-[11px] font-mono uppercase tracking-[0.14em] text-red-300"
          >
            {t.hud.lowHealthAlert} ({hud.hp}/{hud.maxHp})
          </div>
        )}
        {hud.statusBanner && !(hud.isChased && hud.statusBanner === t.banners.monsterChasing) && (
          <div className="bg-[#07090d]/90 border border-zinc-700 px-3.5 py-1 text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-100 text-center">
            {hud.statusBanner}
          </div>
        )}
        {hud.witchWhisper && (
          <div className="bg-[#160e19]/92 border border-purple-700/70 px-4 py-1 text-xs font-serif italic text-purple-200 text-center">
            {hud.witchWhisper}
          </div>
        )}
      </div>

      {/* Exact Center Crosshair & Interaction Prompt */}
      {!modalOpen && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-transform ${
              hud.promptText ? 'bg-amber-300 scale-125' : 'bg-zinc-200/75'
            }`}
          />
          {hud.promptText && (
            <div className="mt-4 px-3 py-1.5 bg-[#07090d]/88 border border-zinc-700/90 text-center">
              <div className="text-xs font-mono uppercase tracking-[0.14em] text-zinc-100">
                {hud.promptText}
              </div>
              {hud.promptSubtext && (
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {hud.promptSubtext}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!modalOpen && !hud.pointerLocked && !hud.promptText && !isTouchMode && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-0.5 bg-[#07090d]/70 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-300/85">
          {t.hud.clickLookHint}
        </div>
      )}

      {/* Bottom Row: HP & Stamina (Left) + 6-Slot Quick Inventory (Center) + Flashlight (Right) */}
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {/* Bottom Left: Character Health (1000 HP), Stamina & Noise */}
        <div
          className={`bg-[#07090d]/86 border border-zinc-800/90 ${
            isTouchMode ? 'px-2.5 py-1.5 min-w-[154px]' : 'px-3 py-2 min-w-[170px] sm:min-w-[264px]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-amber-300/90 mb-1">
            <span>{hud.characterName}</span>
            <span className="text-zinc-400 hidden sm:inline truncate max-w-[175px]">
              {hud.specialAbilityName}
            </span>
          </div>

          {/* Health Bar (1000 HP) */}
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] mb-0.5">
            <span className="text-zinc-300">{t.hud.healthLabel}</span>
            <span
              data-testid="hud-hp-value"
              className={`tabular-nums font-semibold ${
                hud.hp <= 300 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {hud.hp} / {hud.maxHp}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-900 overflow-hidden mb-1.5 border border-zinc-800">
            <div
              className={`h-full transition-[width] duration-100 ${
                hud.hp <= 300 ? 'bg-red-500' : hud.hp <= 600 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>

          {/* Stamina Bar */}
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-400 mb-0.5">
            <span>{hud.isNervous ? t.hud.nervousLabel : t.hud.staminaLabel}</span>
            <span className="tabular-nums text-zinc-200">
              {hud.isHiding
                ? t.hud.hidingStatus
                : hud.isCrouching
                  ? t.hud.crouchStatus
                  : hud.isSprinting
                    ? t.hud.sprintStatus
                    : `${hud.stamina}/${hud.maxStamina}`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 overflow-hidden">
            <div
              className={`h-full transition-[width] duration-75 ${
                hud.isNervous ? 'bg-amber-400' : staminaPct < 25 ? 'bg-red-500' : 'bg-zinc-200'
              }`}
              style={{ width: `${staminaPct}%` }}
            />
          </div>

          {/* Noise / Detection */}
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-400">
            <span>{t.hud.noiseLabel}</span>
            <span
              className={
                hud.monsterAlertLevel > 0.65 ? 'text-red-400 font-semibold' : 'text-zinc-400'
              }
            >
              {hud.monsterAlertLevel > 0.75
                ? t.hud.huntedLabel
                : hud.monsterAlertLevel > 0.35
                  ? t.hud.sensedLabel
                  : t.hud.clearLabel}
            </span>
          </div>
          <div className="w-full h-1 bg-zinc-900 overflow-hidden mt-0.5">
            <div
              className={`h-full transition-[width] duration-75 ${
                noisePct > 70 ? 'bg-red-500' : noisePct > 35 ? 'bg-amber-400' : 'bg-emerald-500/80'
              }`}
              style={{ width: `${noisePct}%` }}
            />
          </div>
        </div>

        {/* Bottom Center: 6-Slot Quick Inventory Bar [1–6] */}
        <div
          data-testid="quick-inventory-bar"
          className="bg-[#07090d]/88 border border-zinc-800/90 px-2 sm:px-3 py-1.5 sm:py-2 pointer-events-auto flex flex-col items-center gap-1"
        >
          <div className="w-full flex items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
            <span className="hidden sm:inline">{t.hud.inventorySlotsLabel}</span>
            <div className="flex items-center gap-1.5 ml-auto">
              {canUseSelected && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="quick-slot-use-btn"
                  onClick={() => onUseQuickSlot(hud.selectedSlotIndex)}
                  className="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-200"
                >
                  {t.hud.useSlotBtn}
                </button>
              )}
              {canDropSelected && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="quick-slot-drop-btn"
                  onClick={onDropSlot}
                  className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
                >
                  {t.hud.dropSlotBtn}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {hud.quickSlots.map((slot, idx) => {
              const selected = idx === hud.selectedSlotIndex;
              const locItem = slot ? localizeItem(slot.item, lang) : null;
              const kindBadge =
                slot?.item.kind === 'healing'
                  ? '+'
                  : slot?.item.kind === 'battery'
                    ? '⚡'
                    : slot?.item.kind === 'key'
                      ? '⚷'
                      : slot
                        ? '◆'
                        : '';
              const kindColor =
                slot?.item.kind === 'healing'
                  ? 'text-emerald-300'
                  : slot?.item.kind === 'battery'
                    ? 'text-amber-300'
                    : slot?.item.kind === 'key'
                      ? 'text-yellow-300'
                      : 'text-sky-300';
              return (
                <button
                  key={idx}
                  type="button"
                  tabIndex={-1}
                  data-testid={`quick-slot-${idx + 1}`}
                  onClick={() => onSelectQuickSlot(idx)}
                  onDoubleClick={() => {
                    if (slot) onUseQuickSlot(idx);
                  }}
                  title={locItem ? `${locItem.name} — ${locItem.description}` : t.hud.emptySlot}
                  className={`relative w-10 h-11 sm:w-14 sm:h-12 border flex flex-col items-center justify-center px-1 transition-colors ${
                    selected
                      ? 'bg-[#251316] border-[#dc2626]'
                      : 'bg-[#0c0f16] border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[8px] font-mono text-zinc-500">
                    {idx + 1}
                  </span>
                  {slot && slot.quantity > 1 && (
                    <span className="absolute top-0.5 right-1 text-[9px] font-mono text-amber-300">
                      x{slot.quantity}
                    </span>
                  )}
                  {locItem ? (
                    <>
                      <span className={`text-xs font-mono leading-none ${kindColor}`}>
                        {kindBadge}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-mono text-zinc-200 truncate w-full text-center mt-0.5">
                        {locItem.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-700">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Right: Flashlight & Battery */}
        <div className="bg-[#07090d]/86 border border-zinc-800/90 px-3 py-2 min-w-[150px] sm:min-w-[225px]">
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-400 mb-1">
            <span className="flex items-center gap-1 shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 text-amber-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6l-6 6-3-3 6-6 3 3zM9 9l-5 5v4h4l5-5" />
              </svg>
              <span className="hidden sm:inline">{t.hud.flashlightLabel}</span>
            </span>
            <span className={`shrink-0 ${hud.flashlightOn ? 'text-amber-300' : 'text-zinc-500'}`}>
              {hud.flashlightOn ? t.hud.on : t.hud.off} · {hud.flashlightBrightness} [G]
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 overflow-hidden mb-1">
            <div
              className={`h-full transition-[width] duration-75 ${
                batteryPct < 20 ? 'bg-red-500' : 'bg-amber-300'
              }`}
              style={{ width: `${batteryPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 tabular-nums">
            <span>
              {t.hud.batteryLabel}: {hud.battery}%
            </span>
            <span>
              {t.hud.spareLabel}: {hud.batteryReserves}
            </span>
          </div>
        </div>
      </div>

      {/* Note / Computer Terminal Reader Modal */}
      {activeNote && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-6 pointer-events-auto">
          <div className="max-w-lg w-full bg-[#12100e] border border-zinc-700 p-6 md:p-7 text-zinc-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber-400/90 mb-1">
              {t.hud.documentRecovered}
            </div>
            <h2 className="text-xl font-serif font-semibold text-zinc-100 mb-1">
              {activeNote.title}
            </h2>
            <div className="text-xs font-mono text-zinc-400 mb-4 border-b border-zinc-800 pb-2">
              {activeNote.author}
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 font-serif mb-4">
              {activeNote.body}
            </p>

            {hud.characterId === 'nam' && activeNote.analyticalHint && (
              <div className="mb-4 p-3 bg-[#0f1620] border border-sky-800/70 text-xs text-sky-200 font-mono">
                <div className="text-[10px] uppercase tracking-wider text-sky-400 mb-1">
                  {t.hud.namInsightTitle}
                </div>
                {activeNote.analyticalHint}
              </div>
            )}

            {hud.characterId === 'hoa' && activeNote.quickClue && (
              <div className="mb-4 p-3 bg-[#101812] border border-emerald-800/70 text-xs text-emerald-200 font-mono">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">
                  {t.hud.hoaInsightTitle}
                </div>
                {activeNote.quickClue}
              </div>
            )}

            <button
              type="button"
              onClick={onCloseNote}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono uppercase tracking-[0.18em] text-zinc-100"
            >
              {t.hud.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* Interactive School NPC Dialogue Modal */}
      {activeNpc && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-6 pointer-events-auto">
          <div
            data-testid="npc-dialogue-modal"
            className="max-w-lg w-full bg-[#0e1015] border border-zinc-700 p-6 text-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
                {t.hud.schoolEncounter}
              </div>
              <h2 className="text-xl font-serif font-semibold text-zinc-100">
                {activeNpc.npcName}
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-zinc-300 bg-[#080a0e] border border-zinc-800 p-3.5">
              “
              {selectedNpcOption
                ? activeNpc.options.find((o) => o.id === selectedNpcOption.id)?.response ??
                  selectedNpcOption.response
                : activeNpc.greeting}
              ”
            </p>

            {hud.characterId === 'phuong' && activeNpc.emotionalRead && (
              <div className="p-3 bg-[#1d111a] border border-fuchsia-800/60 text-xs text-fuchsia-200">
                {activeNpc.emotionalRead}
              </div>
            )}
            {hud.characterId === 'phuong' && selectedNpcOption?.revealsLie && (
              <div className="p-3 bg-[#261114] border border-red-700/70 text-xs text-red-200 font-mono">
                {activeNpc.options.find((o) => o.id === selectedNpcOption.id)?.revealsLie ??
                  selectedNpcOption.revealsLie}
              </div>
            )}

            <div className="space-y-2">
              {activeNpc.options
                .filter(
                  (opt) => !opt.requiresCharacter || opt.requiresCharacter === hud.characterId
                )
                .map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`npc-option-${opt.id}`}
                    onClick={() => {
                      const rawOpt =
                        hud.activeNpcDialogue?.options.find((o) => o.id === opt.id) ?? opt;
                      setSelectedNpcOption(rawOpt);
                      onSelectNpcOption(rawOpt);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 border text-xs transition-colors ${
                      opt.requiresCharacter
                        ? 'bg-[#221426] hover:bg-[#311c37] border-fuchsia-700/70 text-fuchsia-100'
                        : 'bg-[#141822] hover:bg-[#1e2433] border-zinc-700 text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
            </div>

            {selectedNpcOption?.disappearsAfter && (
              <div className="text-[11px] font-mono italic text-purple-300">
                {t.hud.dissolvesText}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onCloseNpcDialogue}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono uppercase tracking-[0.18em] text-zinc-100"
              >
                {t.hud.leaveBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Puzzle Mechanism Modal */}
      {hud.activePuzzle && (
        <PuzzleModal
          language={lang}
          puzzle={hud.activePuzzle}
          characterId={hud.characterId}
          onSubmit={onSubmitPuzzle}
          onClose={onClosePuzzle}
        />
      )}
    </div>
  );
};
