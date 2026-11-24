import React from 'react';
import { getUiStrings } from '../game/i18n';
import type { LanguageCode } from '../types/game';

interface LoadingScreenProps {
  language: LanguageCode;
  level: number;
  levelName: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ language, level, levelName }) => {
  const t = getUiStrings(language);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#040507] text-zinc-200 p-8">
      <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-[#ef4444] mb-2">
        {t.loading.entering} {String(level).padStart(2, '0')}
      </div>
      <h2 className="text-2xl font-serif tracking-wider text-zinc-100 mb-6">{levelName}</h2>
      <div className="w-64 h-1 bg-zinc-900 overflow-hidden">
        <div className="h-full w-3/4 bg-zinc-200 transition-all duration-300" />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500 mt-4 text-center">
        {t.loading.tip}
      </p>
    </div>
  );
};
