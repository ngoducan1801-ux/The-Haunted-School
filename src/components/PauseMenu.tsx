import React from 'react';
import { getUiStrings } from '../game/i18n';
import type { LanguageCode } from '../types/game';

interface PauseMenuProps {
  language: LanguageCode;
  level: number;
  levelName: string;
  onResume: () => void;
  onOpenMap: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  language,
  level,
  levelName,
  onResume,
  onOpenMap,
  onRestart,
  onOpenSettings,
  onReturnToTitle,
}) => {
  const t = getUiStrings(language);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040507]/85 p-6">
      <div className="w-full max-w-sm bg-[#0b0d12] border border-zinc-700/80 p-6 md:p-7">
        <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#ef4444] mb-1">
          {t.pause.tag}
        </div>
        <h2 className="text-2xl font-serif font-bold text-zinc-100 mb-1">
          {t.titleScreen.levelWord} {level}: {levelName}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">{t.pause.subtitle}</p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 bg-[#881b1b] hover:bg-[#a32222] text-zinc-50 border border-[#dc2626]/60 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.pause.resume}
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            className="w-full py-2.5 px-4 bg-[#12151d] hover:bg-[#1a1f2b] text-amber-300 border border-zinc-700 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.pause.openMap}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-[#12151d] hover:bg-[#1a1f2b] text-zinc-200 border border-zinc-700 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.pause.restart}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 bg-[#12151d] hover:bg-[#1a1f2b] text-zinc-200 border border-zinc-700 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.pause.settings}
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.pause.returnTitle}
          </button>
        </div>
      </div>
    </div>
  );
};
