import type { DynamicMusicState, GameSettings, JumpScareType, MonsterType } from '../types/game';

/**
 * Procedural Web Audio Horror Sound Engine (Part 4 Full Integration).
 * Features 6+ independent mixer channels, lobby horror atmosphere,
 * level-specific soundscapes (Levels 1-10), 7 dynamic music states,
 * silence-first fear pacing, jump scare stingers, and victory/ending themes.
 */
export class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private npcGain: GainNode | null = null;
  private monsterGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private windNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLevelGain: GainNode | null = null;

  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  private isLobbyMode = true;
  private musicState: DynamicMusicState = 'exploration';
  private activeLevel = 1;
  private nextAmbientEventTime = 0;
  private nextTensionBeatTime = 0;
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public init(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();
      this.npcGain = this.ctx.createGain();
      this.monsterGain = this.ctx.createGain();
      this.uiGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.ambienceGain.connect(this.masterGain);
      this.npcGain.connect(this.masterGain);
      this.monsterGain.connect(this.masterGain);
      this.uiGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // 3-second brown/pink noise buffer for wind, footsteps, whispers, static, paper
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 3;
      this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.035 * white) / 1.035;
        lastOut = data[i];
        data[i] *= 2.8;
      }

      this.startSubtleWindDraft();
      this.startDynamicMusicBed();
      this.applySettings(this.settings);
      this.started = true;
      this.nextAmbientEventTime = performance.now() + 4500 + Math.random() * 7500;
      this.nextTensionBeatTime = performance.now() + 1200;
    } catch {
      // AudioContext unavailable in restricted environments
    }
  }

  public setLobbyMode(inLobby: boolean): void {
    this.isLobbyMode = inLobby;
    this.updateMusicMix();
  }

  public setMusicState(state: DynamicMusicState, level: number): void {
    if (this.musicState === state && this.activeLevel === level) return;
    this.musicState = state;
    this.activeLevel = level;
    this.updateMusicMix();
  }

  private updateMusicMix(): void {
    if (!this.ctx || !this.droneGain || !this.droneFilter || !this.windLevelGain || !this.tensionGain) {
      return;
    }
    const now = this.ctx.currentTime;

    if (this.isLobbyMode) {
      this.droneGain.gain.setTargetAtTime(0.042, now, 0.5);
      this.droneFilter.frequency.setTargetAtTime(125, now, 0.5);
      this.windLevelGain.gain.setTargetAtTime(0.06, now, 0.5);
      this.tensionGain.gain.setTargetAtTime(0, now, 0.3);
      return;
    }

    if (this.musicState === 'silence') {
      // Sudden unnerving silence cut
      this.droneGain.gain.setTargetAtTime(0, now, 0.14);
      this.windLevelGain.gain.setTargetAtTime(0.004, now, 0.14);
      this.tensionGain.gain.setTargetAtTime(0, now, 0.12);
      return;
    }

    const levelToneBoost = this.activeLevel >= 9 ? 0.036 : 0.014;
    const droneTargets: Record<DynamicMusicState, number> = {
      exploration: this.activeLevel === 8 ? 0.004 : levelToneBoost,
      suspicion: 0.035,
      npc_encounter: 0.026,
      danger: 0.055,
      chase: 0.085,
      escape: 0.072,
      silence: 0,
    };
    const filterTargets: Record<DynamicMusicState, number> = {
      exploration: 110,
      suspicion: 145,
      npc_encounter: 165,
      danger: 210,
      chase: 320,
      escape: 260,
      silence: 80,
    };

    this.droneGain.gain.setTargetAtTime(droneTargets[this.musicState], now, 0.45);
    this.droneFilter.frequency.setTargetAtTime(filterTargets[this.musicState], now, 0.45);
    this.windLevelGain.gain.setTargetAtTime(
      this.activeLevel === 8 ? 0.018 : this.activeLevel === 6 ? 0.075 : 0.045,
      now,
      0.5
    );
  }

  private startDynamicMusicBed(): void {
    if (!this.ctx || !this.musicGain) return;
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 120;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = this.isLobbyMode ? 0.042 : 0.012;

    this.droneOscA = this.ctx.createOscillator();
    this.droneOscA.type = 'sine';
    this.droneOscA.frequency.value = 43.65; // Low F1

    this.droneOscB = this.ctx.createOscillator();
    this.droneOscB.type = 'triangle';
    this.droneOscB.frequency.value = 45.8; // Slow beating dissonance

    this.droneOscA.connect(this.droneFilter);
    this.droneOscB.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.musicGain);

    this.tensionOsc = this.ctx.createOscillator();
    this.tensionOsc.type = 'sawtooth';
    this.tensionOsc.frequency.value = 65;
    const tFilter = this.ctx.createBiquadFilter();
    tFilter.type = 'lowpass';
    tFilter.frequency.value = 180;
    this.tensionGain = this.ctx.createGain();
    this.tensionGain.gain.value = 0;

    this.tensionOsc.connect(tFilter);
    tFilter.connect(this.tensionGain);
    this.tensionGain.connect(this.musicGain);

    this.droneOscA.start();
    this.droneOscB.start();
    this.tensionOsc.start();
  }

  public applySettings(settings: GameSettings): void {
    this.settings = settings;
    if (
      !this.ctx ||
      !this.masterGain ||
      !this.musicGain ||
      !this.ambienceGain ||
      !this.npcGain ||
      !this.monsterGain ||
      !this.uiGain ||
      !this.sfxGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    const master = settings.muted ? 0 : settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.04);
    this.ambienceGain.gain.setTargetAtTime(settings.ambienceVolume, now, 0.04);
    this.npcGain.gain.setTargetAtTime(settings.npcVolume, now, 0.04);
    this.monsterGain.gain.setTargetAtTime(settings.monsterVolume, now, 0.04);
    this.uiGain.gain.setTargetAtTime(settings.uiVolume, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.04);
  }

  private startSubtleWindDraft(): void {
    if (!this.ctx || !this.ambienceGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 185;
    this.windFilter.Q.value = 1.6;

    this.windLevelGain = this.ctx.createGain();
    this.windLevelGain.gain.value = 0.055;

    src.connect(this.windFilter);
    this.windFilter.connect(this.windLevelGain);
    this.windLevelGain.connect(this.ambienceGain);
    src.start();
    this.windNode = src;
  }

  /**
   * Lobby-specific unsettling ambience loop (wind, creaks, metallic clinks, distant steps).
   */
  public tickLobbyAmbience(nowMs: number): void {
    if (!this.started || !this.ctx || this.ctx.state !== 'running') return;
    if (nowMs < this.nextAmbientEventTime) return;
    this.nextAmbientEventTime = nowMs + 7500 + Math.random() * 11000;

    const roll = Math.random();
    if (roll < 0.28) this.playWindGust();
    else if (roll < 0.52) this.playDistantMetallicClank();
    else if (roll < 0.74) this.playFloorboardCreak();
    else if (roll < 0.9) this.playDistantFootsteps();
    else this.playSparsePianoNote(293.66); // Lonely high D4 lobby chime
  }

  /**
   * Level-specific horror soundscape + dynamic state pulse (Levels 1-10).
   */
  public tickAmbience(
    nowMs: number,
    level: number,
    supernaturalRate: number,
    isOutdoor: boolean,
    dynamicState: DynamicMusicState
  ): void {
    if (!this.started || !this.ctx || this.ctx.state !== 'running') return;
    this.setMusicState(dynamicState, level);

    // Dynamic chase / danger / escape rhythmic heartbeat tension
    if (
      (dynamicState === 'danger' || dynamicState === 'chase' || dynamicState === 'escape') &&
      nowMs >= this.nextTensionBeatTime
    ) {
      const interval = dynamicState === 'chase' ? 420 : dynamicState === 'escape' ? 560 : 780;
      this.nextTensionBeatTime = nowMs + interval;
      this.playTensionHeartbeat(dynamicState === 'chase' ? 0.16 : 0.09);
    }

    if (dynamicState === 'silence' || nowMs < this.nextAmbientEventTime) return;

    const baseWait = level === 8 ? 16000 : 12000;
    const minWait = Math.max(4800, baseWait - supernaturalRate * 6500);
    const maxWait = Math.max(9500, baseWait * 2 - supernaturalRate * 9500);
    this.nextAmbientEventTime = nowMs + minWait + Math.random() * (maxWait - minWait);

    if (isOutdoor) {
      this.playWindGust();
      return;
    }

    const roll = Math.random();
    switch (level) {
      case 1:
        if (roll < 0.35) this.playDistantFootsteps();
        else if (roll < 0.65) this.playWindGust();
        else this.playDistantMetallicClank();
        break;
      case 2:
        if (roll < 0.38) this.playClassroomChairScrape();
        else if (roll < 0.72) this.playPaperRustle();
        else this.playFloorboardCreak();
        break;
      case 3:
        if (roll < 0.36) this.playWhisperEcho();
        else if (roll < 0.7) this.playPaperRustle();
        else this.playDistantFootsteps();
        break;
      case 4:
        if (roll < 0.42) this.playElectricalBuzz();
        else if (roll < 0.75) this.playDistantMetallicClank();
        else this.playVentilationHum();
        break;
      case 5:
        if (roll < 0.38) this.playDistantFootsteps();
        else if (roll < 0.72) this.playWhisperEcho();
        else this.playClassroomChairScrape();
        break;
      case 6:
        if (roll < 0.35) this.playWaterDrip();
        else if (roll < 0.68) this.playVentilationHum();
        else this.playDistantMetallicClank();
        break;
      case 7:
        if (roll < 0.4) this.playWhisperEcho();
        else if (roll < 0.75) this.playWitchChime(false);
        else this.playFloorboardCreak();
        break;
      case 8:
        if (roll < 0.4) this.playElectricalBuzz();
        else if (roll < 0.7) this.playDistantMetallicClank();
        else this.playWaterDrip();
        break;
      case 9:
        if (roll < 0.35) this.playSparsePianoNote(220);
        else if (roll < 0.7) this.playWhisperEcho();
        else this.playDistantFootsteps();
        break;
      default:
        if (roll < 0.35) this.playSparsePianoNote(196);
        else if (roll < 0.65) this.playWhisperEcho();
        else this.playDistantMetallicClank();
        break;
    }
  }

  private playTensionHeartbeat(levelGain: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    [0, 0.14].forEach((offset, i) => {
      if (!this.ctx || !this.musicGain) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 64 : 52, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(levelGain * (i === 0 ? 1 : 0.7), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  private playSparsePianoNote(freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 2.2);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 2.3);
  }

  public playStageClearMusic(level: number, completedAll: boolean): void {
    if (!this.started || !this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = completedAll
      ? [261.63, 311.13, 392.0, 523.25, 659.25] // Grand bittersweet survival ending chord
      : [220, 261.63, 329.63, 392.0]; // Relief / uneasy transition
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const t = now + idx * (completedAll ? 0.24 : 0.18);
      const osc = this.ctx.createOscillator();
      osc.type = completedAll ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f + (level % 2) * 2, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 1.8);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 1.9);
    });
  }

  public playUiClick(): void {
    if (!this.started || !this.ctx || !this.uiGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g);
    g.connect(this.uiGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playChatNotification(): void {
    if (!this.started || !this.ctx || !this.uiGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = [660, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.uiGain) return;
      const t = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.uiGain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playBreathExertion(exhausted: boolean): void {
    if (!this.started || !this.ctx || !this.sfxGain || !this.noiseBuffer || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(exhausted ? 560 : 420, now);
    filter.Q.value = 1.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(exhausted ? 0.14 : 0.075, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now, 0.3, 0.38);
  }

  public playFootstep(
    sprinting: boolean,
    crouching: boolean,
    surface: 'tile' | 'wood' | 'concrete' | 'gravel'
  ): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const pitchVar = 0.92 + Math.random() * 0.16;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value =
      pitchVar * (surface === 'gravel' ? 1.5 : surface === 'wood' ? 0.85 : 1.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value =
      surface === 'tile' ? 680 : surface === 'wood' ? 320 : surface === 'gravel' ? 1200 : 520;
    filter.Q.value = 1.4;

    const vol = crouching ? 0.06 : sprinting ? 0.24 : 0.14;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now, Math.random() * 1.5, 0.13);
  }

  public playFlashlightClick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.032);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playDoorCreak(opening: boolean, slam = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (slam && this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(now, 0.1, 0.3);
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 140 : 210, now);
    osc.frequency.linearRampToValueAtTime(opening ? 235 : 115, now + 0.34);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 5.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playLockedRattle(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.085;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(190 - i * 25, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.055);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  public playPickup(kind: 'key' | 'battery' | 'note' | 'other'): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (kind === 'key') {
      [2100, 2650].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.14, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.2);
      });
    } else if (kind === 'note') {
      this.playPaperRustle(true);
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  }

  public playSecretMechanism(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(72, now);
    osc.frequency.linearRampToValueAtTime(52, now + 0.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 210;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  public playElectricalBuzz(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBlackoutSurge(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.65);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  public playJumpScare(type: JumpScareType): void {
    if (!this.started || !this.ctx || !this.monsterGain || this.ctx.state !== 'running') return;
    if (type === 'door_slam') {
      this.playDoorCreak(false, true);
      return;
    }
    const now = this.ctx.currentTime;
    // Controlled sharp horror sting + sub-drop (never clipping)
    const freqs =
      type === 'witch_apparition'
        ? [523.25, 554.37, 277.18]
        : [196, 207.65, 98];
    freqs.forEach((f) => {
      if (!this.ctx || !this.monsterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.76, now + 0.55);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = type === 'witch_apparition' ? 1100 : 480;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.65);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.monsterGain);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  public playNpcVoiceCue(role: 'witch' | 'student' | 'guard' | 'archivist'): void {
    if (!this.started || !this.ctx || !this.npcGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (role === 'witch') {
      this.playWitchChime(false);
      return;
    }
    const baseFreq = role === 'guard' ? 145 : role === 'archivist' ? 190 : 255;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.88, now + 0.22);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 540;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.npcGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  private playWindGust(): void {
    if (!this.ctx || !this.ambienceGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.linearRampToValueAtTime(360, now + 1.1);
    filter.frequency.linearRampToValueAtTime(140, now + 2.5);
    filter.Q.value = 2.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain);
    src.start(now, 0, 2.8);
  }

  private playDistantMetallicClank(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 + Math.random() * 140, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.9);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.1);
    osc.connect(gain);
    gain.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 1.15);
  }

  private playDistantFootsteps(): void {
    if (!this.ctx || !this.ambienceGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const steps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < steps; i++) {
      const t = now + i * 0.48;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.045 * (1 - i * 0.14), t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambienceGain);
      src.start(t, Math.random(), 0.16);
    }
  }

  private playFloorboardCreak(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.linearRampToValueAtTime(88, now + 0.45);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  private playClassroomChairScrape(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(245, now);
    osc.frequency.linearRampToValueAtTime(290, now + 0.28);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = 6.0;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.34);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  private playPaperRustle(toSfx = false): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const target = toSfx ? this.sfxGain : this.ambienceGain;
    if (!target) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(toSfx ? 0.16 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    src.start(now, 0, 0.18);
  }

  private playWhisperEcho(): void {
    if (!this.ctx || !this.npcGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.linearRampToValueAtTime(980, now + 0.6);
    filter.Q.value = 6.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.72);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.npcGain);
    src.start(now, 0.4, 0.75);
  }

  private playWaterDrip(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);
    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private playVentilationHum(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(58, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 1.8);
    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 1.9);
  }

  public playMonsterCue(type: MonsterType): void {
    if (!this.started || !this.ctx || !this.monsterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (type === 'shadow_walker') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(58, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.9);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.95);
      osc.connect(gain);
      gain.connect(this.monsterGain);
      osc.start(now);
      osc.stop(now + 1.0);
    } else if (type === 'hallway_stalker') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(108, now);
      osc.frequency.linearRampToValueAtTime(64, now + 0.55);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 320;
      filter.Q.value = 4.2;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.monsterGain);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (type === 'crawler') {
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.065;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(920 - i * 110, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.035);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        osc.connect(gain);
        gain.connect(this.monsterGain);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } else {
      if (!this.noiseBuffer) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.linearRampToValueAtTime(1450, now + 0.45);
      filter.Q.value = 7.0;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.monsterGain);
      src.start(now, 0.2, 0.55);
    }
  }

  public playWitchChime(vanish: boolean): void {
    if (!this.started || !this.ctx || !this.npcGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const freqs = vanish ? [698.46, 523.25, 311.13] : [440, 523.25, 659.25];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.npcGain) return;
      const t = now + idx * 0.075;
      const osc = this.ctx.createOscillator();
      osc.type = vanish ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vanish ? 0.14 : 0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.48);
      osc.connect(gain);
      gain.connect(this.npcGain);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  public playPuzzleFeedback(solved: boolean): void {
    if (!this.started || !this.ctx || !this.uiGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (solved) {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        if (!this.ctx || !this.uiGain) return;
        const t = now + i * 0.06;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.13, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(this.uiGain);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.18);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.uiGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  }

  public dispose(): void {
    try {
      this.windNode?.stop();
      this.droneOscA?.stop();
      this.droneOscB?.stop();
      this.tensionOsc?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore audio cleanup errors
    }
    this.started = false;
  }
}
