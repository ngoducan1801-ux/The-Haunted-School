import React, { useEffect, useRef, useState } from 'react';
import { getUiStrings, localizePuzzle } from '../game/i18n';
import type { CharacterId, LanguageCode, PuzzleDefinition } from '../types/game';

interface PuzzleModalProps {
  language: LanguageCode;
  puzzle: PuzzleDefinition;
  characterId: CharacterId;
  onSubmit: (puzzleId: string, answer: string) => boolean;
  onClose: () => void;
}

export const PuzzleModal: React.FC<PuzzleModalProps> = ({
  language,
  puzzle: rawPuzzle,
  characterId,
  onSubmit,
  onClose,
}) => {
  const t = getUiStrings(language);
  const puzzle = localizePuzzle(rawPuzzle, language);

  const [textValue, setTextValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTextValue('');
    setSelectedOrder([]);
    setShowHint(false);
    setErrorMsg(null);
    if (puzzle.inputMode === 'input') {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [puzzle.id, puzzle.inputMode]);

  const handleSubmit = (candidate: string) => {
    const ok = onSubmit(puzzle.id, candidate);
    if (!ok) {
      setErrorMsg(t.puzzle.wrongAnswer);
    }
  };

  const remainingOptions =
    puzzle.inputMode === 'sequence_order' && puzzle.options
      ? puzzle.options.filter((opt) => !selectedOrder.includes(opt))
      : [];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 md:p-5 pointer-events-auto overflow-y-auto">
      <div
        data-testid="puzzle-modal"
        className="max-w-xl w-full bg-[#0b0e14] border border-zinc-700 p-5 md:p-7 text-zinc-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400">
              {t.titleScreen.levelWord} {String(puzzle.level).padStart(2, '0')} · {puzzle.kind} · {t.puzzle.mechanismTag}
            </div>
            <h2 className="text-xl font-serif font-semibold text-zinc-100 mt-0.5">
              {puzzle.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-300"
          >
            {t.puzzle.closeBtn}
          </button>
        </div>

        <p className="text-sm leading-relaxed text-zinc-200">{puzzle.prompt}</p>

        {/* Discoverable Clues */}
        <div className="bg-[#07090d] border border-zinc-800 p-3.5 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
            {t.puzzle.observedClues}
          </div>
          {puzzle.clues.map((clue, idx) => (
            <div key={idx} className="text-xs font-mono text-zinc-300 leading-relaxed">
              • {clue}
            </div>
          ))}
        </div>

        {/* Character Ability Insights (Nam & Hoa) */}
        {characterId === 'nam' && puzzle.analyticalHint && (
          <div className="p-3 bg-[#0f1620] border border-sky-800/70 text-xs text-sky-200 font-mono">
            <span className="text-sky-400 uppercase tracking-wider mr-2">{t.puzzle.namTag}</span>
            {puzzle.analyticalHint}
          </div>
        )}
        {characterId === 'hoa' && puzzle.quickHint && (
          <div className="p-3 bg-[#101812] border border-emerald-800/70 text-xs text-emerald-200 font-mono">
            <span className="text-emerald-400 uppercase tracking-wider mr-2">
              {t.puzzle.hoaTag}
            </span>
            {puzzle.quickHint}
          </div>
        )}

        {/* Progressive Hint (Optional, never auto-spoils) */}
        <div>
          {!showHint ? (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="text-[11px] font-mono uppercase tracking-[0.16em] text-amber-300/90 hover:text-amber-200 underline underline-offset-4"
            >
              {t.puzzle.revealHint}
            </button>
          ) : (
            <div className="p-2.5 bg-[#17130c] border border-amber-800/60 text-xs text-amber-200 font-mono">
              {t.puzzle.hintPrefix} {puzzle.hint}
            </div>
          )}
        </div>

        {/* Input Mode Controls */}
        {puzzle.inputMode === 'choice' && puzzle.options && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {puzzle.options.map((opt) => (
              <button
                key={opt}
                type="button"
                data-testid={`puzzle-choice-${opt}`}
                onClick={() => handleSubmit(opt)}
                className="py-2.5 px-3 bg-[#131722] hover:bg-[#7f1d1d] border border-zinc-700 hover:border-[#dc2626] text-xs font-mono uppercase tracking-[0.14em] text-zinc-100 transition-colors"
              >
                {puzzle.optionLabels?.[opt] ?? opt}
              </button>
            ))}
          </div>
        )}

        {puzzle.inputMode === 'input' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(textValue);
            }}
            className="flex gap-2.5 pt-1"
          >
            <input
              ref={inputRef}
              type="text"
              data-testid="puzzle-answer-input"
              value={textValue}
              onChange={(e) => {
                setErrorMsg(null);
                setTextValue(e.target.value);
              }}
              placeholder={t.puzzle.placeholder}
              className="flex-1 bg-[#07090d] border border-zinc-700 px-3.5 py-2.5 text-sm font-mono uppercase text-zinc-100 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              data-testid="puzzle-submit-btn"
              className="px-5 py-2.5 bg-[#881b1b] hover:bg-[#a32222] border border-[#dc2626]/70 text-xs font-mono uppercase tracking-[0.18em] text-white"
            >
              {t.puzzle.submit}
            </button>
          </form>
        )}

        {puzzle.inputMode === 'sequence_order' && puzzle.options && (
          <div className="space-y-3 pt-1">
            <div className="bg-[#07090d] border border-zinc-800 p-3 min-h-[52px]">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-1.5">
                {t.puzzle.selectedSeq} ({selectedOrder.length}/{puzzle.options.length})
              </div>
              {selectedOrder.length === 0 ? (
                <div className="text-xs font-mono text-zinc-500">{t.puzzle.clickOrderHint}</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedOrder.map((item, idx) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 bg-[#1e1b14] border border-amber-700/70 text-xs font-mono text-amber-200"
                    >
                      {idx + 1}. {puzzle.optionLabels?.[item] ?? item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {remainingOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {remainingOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSelectedOrder((prev) => [...prev, opt]);
                    }}
                    className="px-3 py-2 bg-[#141822] hover:bg-[#1f2636] border border-zinc-700 text-xs font-mono text-zinc-200"
                  >
                    + {puzzle.optionLabels?.[opt] ?? opt}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder([]);
                  setErrorMsg(null);
                }}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-[0.14em] text-zinc-300"
              >
                {t.puzzle.resetOrder}
              </button>
              <button
                type="button"
                data-testid="puzzle-submit-btn"
                disabled={selectedOrder.length !== puzzle.options.length}
                onClick={() => handleSubmit(selectedOrder.join(','))}
                className="px-5 py-2 bg-[#881b1b] hover:bg-[#a32222] disabled:bg-zinc-800 disabled:text-zinc-500 border border-[#dc2626]/70 disabled:border-zinc-700 text-xs font-mono uppercase tracking-[0.18em] text-white"
              >
                {t.puzzle.confirmOrder}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            data-testid="puzzle-error"
            className="p-2.5 bg-[#291014] border border-red-700/80 text-xs font-mono text-red-200"
          >
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
