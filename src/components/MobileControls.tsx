import React, { useRef, useState } from 'react';
import { getUiStrings } from '../game/i18n';
import type { LanguageCode } from '../types/game';

interface MobileControlsProps {
  language: LanguageCode;
  scale: number;
  flashlightOn: boolean;
  isCrouching: boolean;
  canInteract: boolean;
  canUseSelected: boolean;
  onMoveVector: (x: number, z: number) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onSprintChange: (active: boolean) => void;
  onJump: () => void;
  onCrouch: () => void;
  onFlashlight: () => void;
  onInteract: () => void;
  onUseItem: () => void;
  onOpenMap: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  language,
  scale,
  flashlightOn,
  isCrouching,
  canInteract,
  canUseSelected,
  onMoveVector,
  onLookDelta,
  onSprintChange,
  onJump,
  onCrouch,
  onFlashlight,
  onInteract,
  onUseItem,
  onOpenMap,
}) => {
  const t = getUiStrings(language);
  const clampedScale = Math.max(0.8, Math.min(1.3, scale));

  // Left Analog Stick state (multi-touch pointerId locked)
  const stickPointerRef = useRef<number | null>(null);
  const stickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprintLocked, setSprintLocked] = useState(false);

  // Right Camera Look touch pad state
  const lookPointerRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 36 * clampedScale;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const dx = clientX - stickOriginRef.current.x;
    const dy = clientY - stickOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0.001 ? Math.cos(angle) * clampedDist : 0;
    const ky = dist > 0.001 ? Math.sin(angle) * clampedDist : 0;
    setKnobOffset({ x: kx, y: ky });

    const normX = Math.max(-1, Math.min(1, kx / maxRadius));
    const normForward = Math.max(-1, Math.min(1, -ky / maxRadius));
    onMoveVector(normX, normForward);

    // Auto-sprint if pushed far near rim and not toggled off
    if (!sprintLocked) {
      onSprintChange(clampedDist / maxRadius > 0.9);
    }
  };

  const resetStick = () => {
    stickPointerRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMoveVector(0, 0);
    if (!sprintLocked) {
      onSprintChange(false);
    }
  };

  return (
    <div
      data-testid="mobile-controls-overlay"
      className="fixed inset-0 z-15 pointer-events-none select-none touch-none"
    >
      {/* Right Half Camera Look Surface (behind right thumb action cluster) */}
      <div
        data-testid="mobile-look-pad"
        onPointerDown={(e) => {
          if (lookPointerRef.current !== null) return;
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          lookPointerRef.current = e.pointerId;
          lastLookPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (lookPointerRef.current !== e.pointerId) return;
          e.stopPropagation();
          const dx = e.clientX - lastLookPosRef.current.x;
          const dy = e.clientY - lastLookPosRef.current.y;
          lastLookPosRef.current = { x: e.clientX, y: e.clientY };
          onLookDelta(dx, dy);
        }}
        onPointerUp={(e) => {
          if (lookPointerRef.current === e.pointerId) {
            lookPointerRef.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (lookPointerRef.current === e.pointerId) {
            lookPointerRef.current = null;
          }
        }}
        className="fixed right-0 top-14 bottom-24 w-[46vw] pointer-events-auto touch-none"
        aria-label={t.mobile.lookArea}
      />

      {/* Left Virtual Movement Joystick */}
      <div
        data-testid="mobile-joystick"
        style={{ transform: `scale(${clampedScale})`, transformOrigin: 'bottom left' }}
        onPointerDown={(e) => {
          if (stickPointerRef.current !== null) return;
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          stickPointerRef.current = e.pointerId;
          const rect = e.currentTarget.getBoundingClientRect();
          stickOriginRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
          updateStickFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPointerRef.current !== e.pointerId) return;
          e.stopPropagation();
          updateStickFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickPointerRef.current === e.pointerId) {
            resetStick();
          }
        }}
        onPointerCancel={(e) => {
          if (stickPointerRef.current === e.pointerId) {
            resetStick();
          }
        }}
        className="fixed left-4 bottom-[122px] w-24 h-24 rounded-full bg-[#090c12]/65 border-2 border-zinc-500/75 flex items-center justify-center pointer-events-auto touch-none"
      >
        <div className="w-10 h-10 rounded-full border border-zinc-600/60" />
        <div
          style={{
            transform: `translate(${knobOffset.x / clampedScale}px, ${knobOffset.y / clampedScale}px)`,
          }}
          className="absolute w-10 h-10 rounded-full bg-[#991b1b]/90 border-2 border-zinc-200/90 shadow-lg"
        />
      </div>

      {/* Right Thumb Action Cluster */}
      <div
        style={{ transform: `scale(${clampedScale})`, transformOrigin: 'bottom right' }}
        className="fixed right-4 bottom-24 flex flex-col items-end gap-2 pointer-events-auto touch-none"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onOpenMap();
            }}
            className="w-12 h-11 bg-[#0a0e16]/85 border border-zinc-600 text-[10px] font-mono font-semibold text-zinc-200 active:bg-zinc-700"
          >
            {t.mobile.map}
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onFlashlight();
            }}
            className={`w-12 h-11 border text-[10px] font-mono font-semibold ${
              flashlightOn
                ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                : 'bg-[#0a0e16]/85 border-zinc-600 text-zinc-300'
            }`}
          >
            {t.mobile.light}
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onCrouch();
            }}
            className={`w-14 h-11 border text-[10px] font-mono font-semibold ${
              isCrouching
                ? 'bg-sky-950/90 border-sky-400 text-sky-200'
                : 'bg-[#0a0e16]/85 border-zinc-600 text-zinc-300'
            }`}
          >
            {t.mobile.crouch}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              const next = !sprintLocked;
              setSprintLocked(next);
              onSprintChange(next);
            }}
            className={`w-12 h-12 rounded-full border text-[10px] font-mono font-semibold ${
              sprintLocked
                ? 'bg-[#7f1d1d] border-[#ef4444] text-white'
                : 'bg-[#0a0e16]/85 border-zinc-600 text-zinc-200'
            }`}
          >
            {t.mobile.sprint}
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onUseItem();
            }}
            className={`w-12 h-12 rounded-full border text-[10px] font-mono font-semibold ${
              canUseSelected
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                : 'bg-[#0a0e16]/85 border-zinc-600 text-zinc-400'
            }`}
          >
            {t.mobile.use}
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onJump();
            }}
            className="w-12 h-12 rounded-full bg-[#0a0e16]/85 border border-zinc-500 text-[10px] font-mono font-semibold text-zinc-100 active:bg-zinc-700"
          >
            {t.mobile.jump}
          </button>

          <button
            type="button"
            data-testid="mobile-interact-btn"
            onPointerDown={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            className={`w-14 h-14 rounded-full border-2 text-xs font-mono font-bold ${
              canInteract
                ? 'bg-[#991b1b] border-amber-300 text-white'
                : 'bg-[#141822]/90 border-zinc-500 text-zinc-200'
            }`}
          >
            {t.mobile.interact}
          </button>
        </div>
      </div>
    </div>
  );
};
