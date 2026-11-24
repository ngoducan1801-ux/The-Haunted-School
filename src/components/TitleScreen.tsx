import React, { useEffect } from 'react';
import { getUiStrings, localizeLevel } from '../game/i18n';
import { LEVEL_CONFIGS } from '../game/rules';
import type { LanguageCode } from '../types/game';

interface TitleScreenProps {
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  displayName: string;
  onChangeDisplayName: (name: string) => void;
  selectedLevel: number;
  highestUnlockedLevel: number;
  onSelectLevel: (level: number) => void;
  onOpenSingleplayer: (level: number) => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  language,
  onChangeLanguage,
  displayName,
  onChangeDisplayName,
  selectedLevel,
  highestUnlockedLevel,
  onSelectLevel,
  onOpenSingleplayer,
  onOpenMultiplayer,
  onOpenSettings,
}) => {
  const t = getUiStrings(language);
  const rawCfg = LEVEL_CONFIGS[selectedLevel - 1] ?? LEVEL_CONFIGS[0];
  const activeCfg = localizeLevel(rawCfg, language);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
        e.preventDefault();
        onOpenSingleplayer(selectedLevel);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenSingleplayer, selectedLevel]);

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between items-center p-4 sm:p-6 md:p-10 [@media(max-height:500px)]:p-3 overflow-y-auto pointer-events-auto"
      style={{
        background:
          'radial-gradient(ellipse at 50% 42%, rgba(28,4,8,0.42) 0%, rgba(5,6,10,0.74) 58%, rgba(2,2,4,0.94) 100%)',
      }}
    >
      {/* Top Right Quick Language Switcher */}
      <div className="fixed top-3 right-4 md:top-7 md:right-9 z-30 flex items-center gap-1.5 pointer-events-auto">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-400 mr-1 hidden sm:inline">
          {t.titleScreen.languageLabel}
        </span>
        {(['en', 'vi'] as const).map((code) => (
          <button
            key={code}
            type="button"
            data-testid={`lang-btn-${code}`}
            onClick={() => onChangeLanguage(code)}
            className={`px-2.5 py-1 text-[11px] font-mono uppercase border transition-colors whitespace-nowrap shrink-0 ${
              language === code
                ? 'bg-[#881b1b] border-[#dc2626] text-white font-semibold'
                : 'bg-[#0b0d12]/90 border-zinc-700 text-zinc-300 hover:border-zinc-400'
            }`}
          >
            {code === 'en' ? 'EN' : 'VI'}
          </button>
        ))}
      </div>

      {/* Top Spacer to vertically balance centerpiece */}
      <div className="h-2 [@media(max-height:500px)]:hidden" aria-hidden="true" />

      {/* Centered Hero Anchor + Controls Deck */}
      <div className="w-full max-w-6xl mx-auto my-auto flex flex-col items-center pointer-events-auto">
        {/* Centered Colossal Horror Title Lockup */}
        <div className="relative w-full flex flex-col items-center text-center mb-4 md:mb-6 [@media(max-height:500px)]:mb-1.5">
          {/* Crimson Haunted Aura + Diagonal Claw Scars Behind Title */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[min(92vw,760px)] h-52 [@media(max-height:500px)]:h-24 rounded-full blur-3xl opacity-55"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(185,28,28,0.58) 0%, rgba(127,29,29,0.28) 45%, transparent 74%)',
            }}
          />
          <svg
            viewBox="0 0 720 220"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,760px)] [@media(max-height:500px)]:w-[340px] h-auto opacity-55"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="clawScarGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0" />
                <stop offset="35%" stopColor="#ef4444" stopOpacity="0.85" />
                <stop offset="65%" stopColor="#991b1b" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#450a0a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M120 185 L310 92 L580 18 L325 104 Z" fill="url(#clawScarGrad)" />
            <path d="M165 205 L360 112 L620 42 L372 122 Z" fill="url(#clawScarGrad)" />
            <path d="M225 215 L415 130 L655 72 L428 140 Z" fill="url(#clawScarGrad)" />
          </svg>

          <div className="relative z-10 flex items-center justify-center gap-3 w-full max-w-xl mb-1 [@media(max-height:500px)]:mb-0.5" aria-hidden="true">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#991b1b] to-[#ef4444]" />
            <svg viewBox="0 0 28 28" className="w-4 h-4 [@media(max-height:500px)]:w-3.5 [@media(max-height:500px)]:h-3.5 text-[#ef4444] shrink-0">
              <path d="M14 2 L16.5 11.5 L26 14 L16.5 16.5 L14 26 L11.5 16.5 L2 14 L11.5 11.5 Z" fill="currentColor" opacity="0.92" />
            </svg>
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#991b1b] to-[#ef4444]" />
          </div>

          <h1
            data-testid="horror-game-title"
            className="relative z-10 flex flex-col items-center text-center select-none text-balance max-w-6xl"
          >
            <span className="horror-title-top text-4xl sm:text-6xl md:text-[72px] lg:text-[86px] [@media(max-height:500px)]:text-[28px] font-bold leading-[0.98] uppercase px-2">
              {t.titleScreen.gameTitleTop}
            </span>
            <span className="horror-title-blood text-7xl sm:text-[108px] md:text-[148px] lg:text-[176px] [@media(max-height:500px)]:text-[56px] font-black leading-[0.86] uppercase mt-1 [@media(max-height:500px)]:mt-0.5 px-3">
              {t.titleScreen.gameTitleBottom}
            </span>
          </h1>

          {/* Centered Jagged Razor Blood Slash & Heavy Dripping Drops Ornament */}
          <svg
            viewBox="0 0 720 48"
            className="relative z-10 w-full max-w-[680px] [@media(max-height:500px)]:max-w-[330px] h-auto mt-1 [@media(max-height:500px)]:mt-0.5"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bloodSlashGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3f3f46" stopOpacity="0" />
                <stop offset="16%" stopColor="#991b1b" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="84%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#3f3f46" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M10 6 L160 4 L290 7.2 L360 3 L440 6.8 L560 4 L710 6.2 L545 8.4 L360 6.8 L175 8.6 Z"
              fill="url(#bloodSlashGrad)"
            />
            <path d="M138 6.8 C139 16, 141.5 22, 139.2 28 C137.8 31, 135.4 28.5, 136.3 22 C136.8 16.5, 137.2 11, 138 6.8 Z" fill="#991b1b" />
            <path d="M212 6.2 C213.8 18, 217 28, 214 37 C211.8 40.5, 208.8 37.5, 210 29 C211 21, 211.4 12, 212 6.2 Z" fill="#dc2626" />
            <path d="M294 6.5 C295.4 15, 297.6 22, 295.5 29 C294 31.5, 291.8 29, 292.7 22.5 C293.3 16.5, 293.6 10.5, 294 6.5 Z" fill="#b91c1c" />
            <path d="M358 5.2 C360.5 22, 364 34, 360.5 44 C357.5 47.5, 353.5 43.5, 355.5 33 C356.5 23, 357.2 12, 358 5.2 Z" fill="#ef4444" />
            <path d="M424 6.4 C425.6 16, 428 24, 425.6 31.5 C423.8 34, 421.4 31.5, 422.4 24.5 C423 18, 423.4 11, 424 6.4 Z" fill="#dc2626" />
            <path d="M502 6 C503.8 17, 506.8 26, 504 34.5 C501.8 37.5, 499 35, 500.2 27 C501 20, 501.4 12, 502 6 Z" fill="#b91c1c" />
            <path d="M578 6.8 C579 14, 580.6 19, 578.8 24 C577.4 26.5, 575.4 24.5, 576.2 19.5 C576.8 14.5, 577.2 10.5, 578 6.8 Z" fill="#7f1d1d" />
          </svg>
        </div>

        {/* Centered Control Deck Directly Under the Monumental Title */}
        <div className="relative z-10 w-full max-w-3xl [@media(max-height:500px)]:max-w-4xl grid grid-cols-1 md:grid-cols-12 [@media(max-height:500px)]:grid-cols-12 gap-5 md:gap-7 [@media(max-height:500px)]:gap-4 items-center text-left bg-[#05060a]/58 backdrop-blur-[2px] border border-red-950/60 px-5 py-4 [@media(max-height:500px)]:px-4 [@media(max-height:500px)]:py-2">
          {/* Left: Level Selector Strip */}
          <div className="md:col-span-7 [@media(max-height:500px)]:col-span-7 flex flex-col justify-center">
            <div className="mb-3 [@media(max-height:500px)]:mb-1.5">
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono uppercase tracking-[0.16em] text-zinc-100">
                <span>
                  {t.titleScreen.levelWord} {String(activeCfg.level).padStart(2, '0')} / 10 — {activeCfg.name}
                </span>
                <span className="text-[10px] text-amber-300">
                  · {activeCfg.difficultyLabel}
                </span>
              </div>
              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-400 mt-1 truncate">
                {activeCfg.subtitle}
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {LEVEL_CONFIGS.map((lvl) => {
                const locLvl = localizeLevel(lvl, language);
                const unlocked = lvl.level <= highestUnlockedLevel;
                const isSelected = lvl.level === selectedLevel;
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onSelectLevel(lvl.level)}
                    aria-label={`${t.titleScreen.levelWord} ${lvl.level}: ${locLvl.name}`}
                    className={`h-9 [@media(max-height:500px)]:h-7 text-xs font-mono border transition-colors ${
                      isSelected
                        ? 'bg-[#7f1d1d] border-[#dc2626] text-white font-semibold'
                        : unlocked
                          ? 'bg-[#0b0d12]/85 border-zinc-700 text-zinc-300 hover:border-zinc-400'
                          : 'bg-[#07080b]/60 border-zinc-800/60 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {lvl.level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Survivor Display Name + Primary Actions */}
          <div className="md:col-span-5 [@media(max-height:500px)]:col-span-5">
            <div className="mb-2.5 [@media(max-height:500px)]:mb-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 mb-1">
                {t.titleScreen.displayNameLabel}
              </label>
              <input
                type="text"
                aria-label={t.titleScreen.displayNameLabel}
                data-testid="title-display-name-input"
                maxLength={18}
                value={displayName}
                onChange={(e) => onChangeDisplayName(e.target.value)}
                placeholder={t.titleScreen.displayNamePlaceholder}
                className="w-full bg-[#0b0e14]/92 border border-zinc-700/90 px-3 py-2 [@media(max-height:500px)]:py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#dc2626]"
              />
            </div>

            <div className="flex flex-col gap-2 [@media(max-height:500px)]:gap-1.5">
              <button
                type="button"
                data-start="true"
                data-testid="btn-singleplayer"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenSingleplayer(selectedLevel);
                }}
                className="w-full py-2.5 [@media(max-height:500px)]:py-1.5 px-4 text-left bg-[#881b1b] hover:bg-[#a32222] text-zinc-50 border border-[#dc2626]/70 font-semibold tracking-[0.16em] uppercase text-sm transition-colors flex items-center justify-between gap-2 whitespace-nowrap"
              >
                <span className="truncate">{t.titleScreen.singleplayer}</span>
                <span className="text-[11px] font-mono text-zinc-200 shrink-0">{t.titleScreen.singleplayerSub}</span>
              </button>

              <button
                type="button"
                data-testid="btn-multiplayer"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenMultiplayer();
                }}
                className="w-full py-2 [@media(max-height:500px)]:py-1.5 px-4 text-left bg-[#0c0e13]/90 hover:bg-[#171b24] text-zinc-200 border border-zinc-700/80 tracking-[0.14em] uppercase text-xs transition-colors flex items-center justify-between gap-2 whitespace-nowrap"
              >
                <span className="truncate">{t.titleScreen.multiplayer}</span>
                <span className="text-[11px] font-mono text-zinc-400 shrink-0">{t.titleScreen.multiplayerSub}</span>
              </button>

              <button
                type="button"
                data-testid="btn-settings"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenSettings();
                }}
                className="w-full py-2 [@media(max-height:500px)]:py-1.5 px-4 text-left bg-[#0c0e13]/90 hover:bg-[#171b24] text-zinc-200 border border-zinc-700/80 tracking-[0.14em] uppercase text-xs transition-colors flex items-center justify-between gap-2 whitespace-nowrap"
              >
                <span className="truncate">{t.titleScreen.settings}</span>
                <span className="text-[11px] font-mono text-zinc-400 shrink-0">{t.titleScreen.settingsSub}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin Flat Control Hint */}
      <div className="pt-2 [@media(max-height:500px)]:hidden text-[11px] font-mono tracking-[0.14em] uppercase text-zinc-400 text-center">
        {t.titleScreen.controlsHint}
      </div>
    </div>
  );
};
