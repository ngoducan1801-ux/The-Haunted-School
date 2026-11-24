import React, { useEffect, useState } from 'react';
import { getUiStrings } from '../game/i18n';
import { applyGraphicsPreset, DEFAULT_SETTINGS } from '../game/rules';
import type {
  GameSettings,
  GraphicsQuality,
  KeyBindings,
  QualityTier,
  ShadowQualityTier,
  TouchControlsMode,
  VoiceAudioDevice,
  VoiceMode,
} from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  audioInputDevices?: VoiceAudioDevice[];
  onRefreshMicDevices?: () => void;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

const KEY_FIELDS: Array<keyof KeyBindings> = [
  'forward',
  'backward',
  'left',
  'right',
  'sprint',
  'crouch',
  'jump',
  'flashlight',
  'brightness',
  'interact',
  'useItem',
  'drop',
  'pushToTalk',
  'pause',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  audioInputDevices = [],
  onRefreshMicDevices,
  onChange,
  onClose,
}) => {
  const t = getUiStrings(settings.language);
  const [tab, setTab] = useState<'language' | 'graphics' | 'audio' | 'controls'>('language');
  const [rebindingField, setRebindingField] = useState<keyof KeyBindings | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    if (!rebindingField) return;
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange({
        ...settings,
        keyBindings: {
          ...settings.keyBindings,
          [rebindingField]: e.code,
        },
      });
      setRebindingField(null);
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [rebindingField, settings, onChange]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen restricted by container policy
    }
  };

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#040507]/88 p-3 md:p-8"
    >
      <div className="w-full max-w-2xl bg-[#0b0d12] border border-zinc-700/90 text-zinc-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-zinc-800">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#ef4444]">
              {t.settings.tag}
            </div>
            <h2 className="text-xl font-serif font-bold">{t.settings.title}</h2>
          </div>
          <button
            type="button"
            data-testid="settings-done-btn"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-wider"
          >
            {t.settings.done}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap border-b border-zinc-800 px-5 md:px-6 gap-2 bg-[#08090d]">
          {(['language', 'graphics', 'audio', 'controls'] as const).map((tabId) => (
            <button
              key={tabId}
              type="button"
              data-testid={`settings-tab-${tabId}`}
              onClick={() => setTab(tabId)}
              className={`py-3 px-3.5 text-xs font-mono uppercase tracking-[0.16em] border-b-2 transition-colors ${
                tab === tabId
                  ? 'border-[#dc2626] text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.settings.tabs[tabId]}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-4 text-sm">
          {tab === 'language' && (
            <div className="space-y-4">
              <div>
                <div className="font-medium text-zinc-100">{t.settings.languageTitle}</div>
                <div className="text-xs text-zinc-400 mt-1">{t.settings.languageDesc}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="settings-lang-en"
                  onClick={() => onChange({ ...settings, language: 'en' })}
                  className={`p-4 border text-left transition-colors ${
                    settings.language === 'en'
                      ? 'bg-[#2a0f12] border-[#dc2626] text-white'
                      : 'bg-[#08090d] border-zinc-800 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-sm font-serif font-bold">English</div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1">
                    Original Survival Horror UI &amp; Notes
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="settings-lang-vi"
                  onClick={() => onChange({ ...settings, language: 'vi' })}
                  className={`p-4 border text-left transition-colors ${
                    settings.language === 'vi'
                      ? 'bg-[#2a0f12] border-[#dc2626] text-white'
                      : 'bg-[#08090d] border-zinc-800 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-sm font-serif font-bold">Tiếng Việt</div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1">
                    Toàn bộ giao diện, cốt truyện, câu đố &amp; bản đồ
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'graphics' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-zinc-100">{t.settings.graphicsPresetTitle}</div>
                  <div className="text-xs text-zinc-400">{t.settings.graphicsPresetDesc}</div>
                </div>
                <select
                  aria-label={t.settings.graphicsPresetTitle}
                  data-testid="select-graphics-preset"
                  value={settings.graphicsQuality}
                  onChange={(e) =>
                    onChange(applyGraphicsPreset(settings, e.target.value as GraphicsQuality))
                  }
                  className="bg-[#12151e] border border-zinc-700 px-3 py-2 text-xs font-mono text-zinc-100"
                >
                  {(
                    ['very_low', 'low', 'medium', 'high', 'ultra', 'adaptive'] as const
                  ).map((preset) => (
                    <option key={preset} value={preset}>
                      {t.settings.presets[preset]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.shadowQuality}
                  </label>
                  <select
                    aria-label={t.settings.shadowQuality}
                    value={settings.shadowQuality}
                    onChange={(e) =>
                      onChange({ ...settings, shadowQuality: e.target.value as ShadowQualityTier })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value="off">Off</option>
                    <option value="low">Low (512px)</option>
                    <option value="medium">Medium (1024px)</option>
                    <option value="high">High (1536px)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.textureQuality}
                  </label>
                  <select
                    aria-label={t.settings.textureQuality}
                    value={settings.textureQuality}
                    onChange={(e) =>
                      onChange({ ...settings, textureQuality: e.target.value as QualityTier })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value="low">Low (1x)</option>
                    <option value="medium">Medium (4x Aniso)</option>
                    <option value="high">High (Max Aniso)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.lightingQuality}
                  </label>
                  <select
                    aria-label={t.settings.lightingQuality}
                    value={settings.lightingQuality}
                    onChange={(e) =>
                      onChange({ ...settings, lightingQuality: e.target.value as QualityTier })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value="low">Low (Max 2 Dynamic Lights)</option>
                    <option value="medium">Medium (Max 4 Dynamic Lights)</option>
                    <option value="high">High (Max 6 Dynamic Lights)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.effectsQuality}
                  </label>
                  <select
                    aria-label={t.settings.effectsQuality}
                    value={settings.effectsQuality}
                    onChange={(e) =>
                      onChange({ ...settings, effectsQuality: e.target.value as QualityTier })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.fpsLimit}
                  </label>
                  <select
                    aria-label={t.settings.fpsLimit}
                    value={settings.fpsLimit}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        fpsLimit: Number(e.target.value) as 0 | 60 | 90 | 120,
                      })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value={60}>60 FPS</option>
                    <option value={90}>90 FPS</option>
                    <option value={120}>120 FPS</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.displayMode}
                  </label>
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="w-full px-3 py-1.5 bg-[#141822] hover:bg-[#1e2432] border border-zinc-700 text-xs font-mono uppercase tracking-wider text-left"
                  >
                    {isFullscreen ? t.settings.fullscreenSwitch : t.settings.windowedSwitch}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 uppercase tracking-wider">
                    {t.settings.resolutionScale}
                  </span>
                  <span className="tabular-nums text-amber-300">
                    {Math.round(settings.resolutionScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={t.settings.resolutionScale}
                  min={0.6}
                  max={1.0}
                  step={0.05}
                  value={settings.resolutionScale}
                  onChange={(e) =>
                    onChange({ ...settings, resolutionScale: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#dc2626]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 uppercase tracking-wider">
                    {t.settings.viewDistance}
                  </span>
                  <span className="tabular-nums text-amber-300">{settings.viewDistance}m</span>
                </div>
                <input
                  type="range"
                  aria-label={t.settings.viewDistance}
                  min={45}
                  max={120}
                  step={5}
                  value={settings.viewDistance}
                  onChange={(e) =>
                    onChange({ ...settings, viewDistance: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-[#dc2626]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800/80">
                {(
                  [
                    { key: 'antialiasing', label: t.settings.antialiasing },
                    { key: 'ambientOcclusion', label: t.settings.ambientOcclusion },
                    { key: 'motionBlur', label: t.settings.motionBlur },
                    { key: 'vsync', label: t.settings.vsync },
                    { key: 'showFps', label: t.settings.showFps },
                    { key: 'batteryDrainEnabled', label: t.settings.batteryDrainEnabled },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center justify-between bg-[#08090d] border border-zinc-800 px-3 py-2 cursor-pointer"
                  >
                    <span className="text-xs text-zinc-200">{opt.label}</span>
                    <input
                      type="checkbox"
                      aria-label={opt.label}
                      checked={settings[opt.key]}
                      onChange={(e) => onChange({ ...settings, [opt.key]: e.target.checked })}
                      className="w-4 h-4 accent-[#dc2626]"
                    />
                  </label>
                ))}
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              {(
                [
                  'masterVolume',
                  'musicVolume',
                  'ambienceVolume',
                  'npcVolume',
                  'monsterVolume',
                  'voiceVolume',
                  'uiVolume',
                  'sfxVolume',
                ] as const
              ).map((key) => {
                const label = t.settings.volumes[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300 uppercase tracking-wider">{label}</span>
                      <span className="tabular-nums text-amber-300">
                        {Math.round(settings[key] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={label}
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings[key]}
                      onChange={(e) => onChange({ ...settings, [key]: parseFloat(e.target.value) })}
                      className="w-full accent-[#dc2626]"
                    />
                  </div>
                );
              })}

              <div className="py-2 border-t border-zinc-800/80 space-y-2">
                <div>
                  <div className="font-medium">{t.settings.voiceModeTitle}</div>
                  <div className="text-xs text-zinc-400">{t.settings.voiceModeDesc}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'radio', label: t.settings.voiceRadioLabel },
                      { id: 'spatial', label: t.settings.voiceSpatialLabel },
                    ] as const
                  ).map((modeOpt) => (
                    <button
                      key={modeOpt.id}
                      type="button"
                      data-testid={`settings-voice-mode-${modeOpt.id}`}
                      onClick={() =>
                        onChange({ ...settings, voiceMode: modeOpt.id as VoiceMode })
                      }
                      className={`px-3 py-2 border text-xs font-mono text-left ${
                        settings.voiceMode === modeOpt.id
                          ? 'bg-[#2a0f12] border-[#dc2626] text-white'
                          : 'bg-[#08090d] border-zinc-800 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {modeOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="py-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-xs uppercase tracking-wider font-mono text-zinc-300">
                    {t.settings.voiceInputTitle}
                  </label>
                  {onRefreshMicDevices && (
                    <button
                      type="button"
                      onClick={onRefreshMicDevices}
                      className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300"
                    >
                      {t.lobby.voiceRefreshMics}
                    </button>
                  )}
                </div>
                <select
                  aria-label={t.settings.voiceInputTitle}
                  value={settings.voiceInputDeviceId}
                  onChange={(e) =>
                    onChange({ ...settings, voiceInputDeviceId: e.target.value })
                  }
                  className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-2 text-xs font-mono text-zinc-100"
                >
                  <option value="default">{t.lobby.voiceDefaultMic}</option>
                  {audioInputDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between py-2 border-t border-zinc-800/80 cursor-pointer">
                <div>
                  <div className="font-medium">{t.settings.pushToTalkMode}</div>
                  <div className="text-xs text-zinc-400">
                    {t.settings.pushToTalkDesc(settings.keyBindings.pushToTalk.replace('Key', ''))}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushToTalk}
                  onChange={(e) => onChange({ ...settings, pushToTalk: e.target.checked })}
                  className="w-4 h-4 accent-[#dc2626]"
                />
              </label>

              <label className="flex items-center justify-between py-2 border-t border-zinc-800/80 cursor-pointer">
                <span className="font-medium">{t.settings.muteAll}</span>
                <input
                  type="checkbox"
                  checked={settings.muted}
                  onChange={(e) => onChange({ ...settings, muted: e.target.checked })}
                  className="w-4 h-4 accent-[#dc2626]"
                />
              </label>
            </>
          )}

          {tab === 'controls' && (
            <>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 uppercase tracking-wider">
                    {t.settings.mouseSensitivity}
                  </span>
                  <span className="tabular-nums text-amber-300">
                    {settings.mouseSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={t.settings.mouseSensitivity}
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onChange({ ...settings, mouseSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#dc2626]"
                />
              </div>

              {/* Mobile Touch Controls Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    {t.settings.touchControlsModeTitle}
                  </label>
                  <select
                    aria-label={t.settings.touchControlsModeTitle}
                    value={settings.touchControlsMode}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        touchControlsMode: e.target.value as TouchControlsMode,
                      })
                    }
                    className="w-full bg-[#12151e] border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                  >
                    <option value="auto">{t.settings.touchModeAuto}</option>
                    <option value="on">{t.settings.touchModeOn}</option>
                    <option value="off">{t.settings.touchModeOff}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{t.settings.mobileSensitivity}</span>
                    <span className="text-amber-300">
                      {settings.mobileLookSensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t.settings.mobileSensitivity}
                    min={0.4}
                    max={2.5}
                    step={0.1}
                    value={settings.mobileLookSensitivity}
                    onChange={(e) =>
                      onChange({ ...settings, mobileLookSensitivity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#dc2626]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{t.settings.mobileScale}</span>
                    <span className="text-amber-300">
                      {Math.round(settings.mobileControlScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t.settings.mobileScale}
                    min={0.8}
                    max={1.3}
                    step={0.05}
                    value={settings.mobileControlScale}
                    onChange={(e) =>
                      onChange({ ...settings, mobileControlScale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#dc2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                {KEY_FIELDS.map((field) => {
                  const active = rebindingField === field;
                  return (
                    <div
                      key={field}
                      className="flex items-center justify-between bg-[#08090d] border border-zinc-800 px-3 py-2"
                    >
                      <span className="text-xs text-zinc-300">{t.settings.keyLabels[field]}</span>
                      <button
                        type="button"
                        onClick={() => setRebindingField(field)}
                        className={`px-2.5 py-1 text-[11px] font-mono border ${
                          active
                            ? 'bg-[#7f1d1d] border-[#ef4444] text-white'
                            : 'bg-zinc-900 border-zinc-700 text-amber-300 hover:border-zinc-500'
                        }`}
                      >
                        {active ? t.settings.pressKey : settings.keyBindings[field].replace('Key', '')}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange(DEFAULT_SETTINGS)}
                  className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  {t.settings.resetDefaults}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
