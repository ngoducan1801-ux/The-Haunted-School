import React, { useState } from 'react';
import type { CharacterId, LanguageCode } from '../types/game';
import { getUiStrings, localizeCharacter } from '../game/i18n';
import { CHARACTER_PROFILES, getCharacterProfile } from '../game/rules';
import { CharacterPortrait } from './CharacterPortrait';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

interface CharacterSelectScreenProps {
  language: LanguageCode;
  level: number;
  levelName: string;
  initialInspected?: CharacterId;
  onConfirmCharacter: (characterId: CharacterId) => void;
  onBack: () => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  language,
  level,
  levelName,
  initialInspected = 'ty',
  onConfirmCharacter,
  onBack,
}) => {
  const t = getUiStrings(language);
  const [inspectedId, setInspectedId] = useState<CharacterId>(initialInspected);
  const [confirmedId, setConfirmedId] = useState<CharacterId | null>(null);
  const profile = localizeCharacter(getCharacterProfile(inspectedId), language);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040508]/92 p-3 md:p-8 overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#0a0c11] border border-zinc-800 text-zinc-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-800 bg-[#07090d]">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#ef4444]">
              {t.charSelect.headerTag} · {t.titleScreen.levelWord} {String(level).padStart(2, '0')} — {levelName}
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-bold tracking-wide text-zinc-100">
              {t.charSelect.heading}
            </h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-[0.18em] text-zinc-200"
          >
            {t.charSelect.backToTitle}
          </button>
        </div>

        {/* Main Split: 5-Character Roster + Full 3D Preview & Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
          {/* Left: 5 Character Cards */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 space-y-2.5">
            {CHARACTER_PROFILES.map((rawChar) => {
              const char = localizeCharacter(rawChar, language);
              const isInspected = char.id === inspectedId;
              const isConfirmed = char.id === confirmedId;
              return (
                <button
                  key={char.id}
                  type="button"
                  data-testid={`char-card-${char.id}`}
                  onClick={() => {
                    setInspectedId(char.id);
                    setConfirmedId(char.id);
                  }}
                  className={`w-full text-left p-3 border transition-colors flex items-center gap-3.5 ${
                    isConfirmed
                      ? 'bg-[#2a0f12] border-[#dc2626]'
                      : isInspected
                        ? 'bg-[#141822] border-zinc-400'
                        : 'bg-[#080a0f] border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <CharacterPortrait characterId={char.id} className="w-14 h-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-bold text-base tracking-wider text-zinc-100">
                        {char.codename}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                        {isConfirmed ? t.charSelect.selectedBadge : char.specialAbility}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{char.title}</div>
                    <div className="text-[11px] text-zinc-500 truncate mt-1">
                      {char.personality.slice(0, 2).join(' · ')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: 3D Preview + Detailed Bio + Explicit Confirm */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 bg-[#07090e]">
            {/* Full 3D Model Showcase */}
            <div className="md:col-span-5 relative border-b md:border-b-0 md:border-r border-zinc-800/80 min-h-[280px] bg-[#06070b]">
              <CharacterPreviewCanvas characterId={profile.id} />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#07090d]/85 border border-zinc-800 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-300">
                {t.charSelect.inspectionBadge}
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 bg-[#07090d]/85 border border-zinc-800 text-[11px] font-mono">
                <span className="text-emerald-400">
                  {t.charSelect.hpStat} {profile.maxHp}
                </span>
                <span className="text-zinc-300">
                  {t.charSelect.staminaStat} {profile.maxStamina}
                </span>
                <span className="text-amber-300">
                  {t.charSelect.slotsStat} {profile.inventoryCapacity}
                </span>
              </div>
            </div>

            {/* Character Details & Confirm CTA */}
            <div className="md:col-span-7 p-5 md:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                <div className="flex items-center gap-4">
                  <CharacterPortrait characterId={profile.id} className="w-16 h-16 shrink-0" />
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#ef4444]">
                      {profile.specialAbility}
                    </div>
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-zinc-100">
                      {profile.codename} — {profile.title}
                    </h2>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    {t.charSelect.personalityHeading}
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {profile.personality.map((trait) => (
                      <li key={trait} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-zinc-500" />
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/90 mb-1.5">
                    {t.charSelect.advantagesHeading}
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-200">
                    {profile.advantages.map((adv) => (
                      <li key={adv} className="flex items-start gap-2">
                        <span className="text-amber-400 font-mono">+</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 bg-[#120b0d] border border-red-950/80 text-xs text-zinc-300">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 mr-2">
                    {t.charSelect.tradeoffLabel}
                  </span>
                  {profile.tradeoff}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-zinc-400">
                  {confirmedId
                    ? `${t.charSelect.confirmedPrefix} ${getCharacterProfile(confirmedId).codename}`
                    : t.charSelect.clickHint}
                </div>
                <button
                  type="button"
                  data-testid="confirm-character-btn"
                  onClick={() => onConfirmCharacter(confirmedId ?? inspectedId)}
                  className="px-5 py-3 bg-[#881b1b] hover:bg-[#a32222] border border-[#dc2626]/70 text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold"
                >
                  {t.charSelect.confirmBtn(profile.codename)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
