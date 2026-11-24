import React from 'react';
import { getUiStrings } from '../game/i18n';
import type { LanguageCode } from '../types/game';

interface OrientationGuardProps {
  language: LanguageCode;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ language }) => {
  const t = getUiStrings(language);

  const handleLockLandscape = () => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // Orientation lock is browser-restricted outside fullscreen on some mobile browsers
    }
  };

  return (
    <div
      data-testid="orientation-guard"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040508] text-zinc-100 p-8 text-center"
    >
      <div className="w-16 h-10 border-2 border-[#dc2626] rounded-md mb-5 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-amber-300" />
      </div>
      <h2 className="text-xl font-serif font-bold text-zinc-100 mb-2">
        {t.mobile.rotateTitle}
      </h2>
      <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-6">
        {t.mobile.rotateDesc}
      </p>
      <button
        type="button"
        onClick={handleLockLandscape}
        className="px-5 py-2.5 bg-[#881b1b] hover:bg-[#a32222] border border-[#dc2626] text-xs font-mono uppercase tracking-[0.16em] text-white"
      >
        {t.mobile.rotateBtn}
      </button>
    </div>
  );
};
