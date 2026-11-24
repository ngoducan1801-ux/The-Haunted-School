import React from 'react';
import { getUiStrings } from '../game/i18n';
import type { LanguageCode, StageClearStats } from '../types/game';

interface StageClearModalProps {
  language: LanguageCode;
  stats: StageClearStats;
  onNextLevel: () => void;
  onReplay: () => void;
  onReturnToTitle: () => void;
}

export const StageClearModal: React.FC<StageClearModalProps> = ({
  language,
  stats,
  onNextLevel,
  onReplay,
  onReturnToTitle,
}) => {
  const t = getUiStrings(language);
  const isDefeated = Boolean(stats.defeated);

  return (
    <div
      data-testid="stage-clear-modal"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#040507]/88 p-6"
    >
      <div className="w-full max-w-md bg-[#0b0d12] border border-zinc-700 p-6 md:p-7">
        <div
          className={`text-[11px] font-mono uppercase tracking-[0.22em] mb-1 ${
            isDefeated ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {isDefeated
            ? t.stageClear.defeatedTag
            : stats.completedAll
              ? t.stageClear.allClearedTag
              : `${t.titleScreen.levelWord} ${stats.level} — ${t.stageClear.levelClearedTag}`}
        </div>
        <h2 className="text-2xl font-serif font-bold text-zinc-100 mb-2">{stats.levelName}</h2>
        {isDefeated && <p className="text-xs text-zinc-400 mb-4">{t.stageClear.defeatedDesc}</p>}

        <div className="grid grid-cols-4 gap-2 mb-6 mt-3">
          <div className="bg-[#07090d] border border-zinc-800 p-2.5">
            <div className="text-[10px] font-mono uppercase text-zinc-500">{t.stageClear.time}</div>
            <div className="text-base font-mono tabular-nums text-zinc-100">
              {stats.clearTimeSeconds}s
            </div>
          </div>
          <div className="bg-[#07090d] border border-zinc-800 p-2.5">
            <div className="text-[10px] font-mono uppercase text-zinc-500">
              {t.stageClear.notes}
            </div>
            <div className="text-base font-mono tabular-nums text-zinc-100">
              {stats.notesFound}
            </div>
          </div>
          <div className="bg-[#07090d] border border-zinc-800 p-2.5">
            <div className="text-[10px] font-mono uppercase text-zinc-500">
              {t.stageClear.secrets}
            </div>
            <div className="text-base font-mono tabular-nums text-zinc-100">
              {stats.secretsFound}
            </div>
          </div>
          <div className="bg-[#07090d] border border-zinc-800 p-2.5">
            <div className="text-[10px] font-mono uppercase text-zinc-500">
              {t.stageClear.puzzles}
            </div>
            <div className="text-base font-mono tabular-nums text-zinc-100">
              {stats.puzzlesSolved}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {!isDefeated && !stats.completedAll && (
            <button
              type="button"
              data-start="true"
              onClick={onNextLevel}
              className="w-full py-3 px-4 bg-[#881b1b] hover:bg-[#a32222] text-zinc-50 border border-[#dc2626]/60 text-xs font-mono uppercase tracking-[0.18em]"
            >
              {t.stageClear.nextLevel(stats.level + 1)}
            </button>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="w-full py-2.5 px-4 bg-[#12151d] hover:bg-[#1a1f2b] text-zinc-200 border border-zinc-700 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.stageClear.replay}
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 bg-transparent hover:bg-zinc-900 text-zinc-400 border border-zinc-800 text-xs font-mono uppercase tracking-[0.18em]"
          >
            {t.stageClear.returnTitle}
          </button>
        </div>
      </div>
    </div>
  );
};
