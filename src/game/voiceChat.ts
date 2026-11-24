import {
  computeVoiceModeMix,
  countWallsBetween,
  isPoliteVoicePeer,
  parseIceServersConfig,
  type ColliderBox,
} from './rules';
import type {
  NetworkPlayerState,
  PeerVoiceTelemetry,
  VoiceAudioDevice,
  VoiceDiagnosticsSnapshot,
  VoiceMode,
  VoicePeerConnectionState,
} from '../types/game';

interface PeerAudioEntry {
  peerId: string;
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  sourceNode: MediaStreamAudioSourceNode | null;
  highpassNode: BiquadFilterNode | null;
  presenceNode: BiquadFilterNode | null;
  lowpassNode: BiquadFilterNode | null;
  compressorNode: DynamicsCompressorNode | null;
  gainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  freqBuffer: Uint8Array<ArrayBuffer> | null;
  pendingCandidates: RTCIceCandidateInit[];
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  connectionState: VoicePeerConnectionState;
  muted: boolean;
  receivingAudio: boolean;
  lastDistanceMeters: number;
  lastWallsBetween: number;
  lastRestartAttemptMs: number;
  smoothedLevel: number;
}

const SPEAK_THRESHOLD = 0.045;

/**
 * WebRTC Peer-to-Peer Voice Chat with Perfect Negotiation, ICE restart recovery,
 * Web Audio vocal DSP clarity chain, Radio/Spatial switching, and live telemetry.
 */
export class ProximityVoiceManager {
  private peers = new Map<string, PeerAudioEntry>();
  private localStream: MediaStream | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localFreqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private localSmoothedLevel = 0;

  private audioCtx: AudioContext | null = null;
  private localPlayerId = '';
  private micEnabled = false;
  private pushToTalkMode = false;
  private pushToTalkHeld = false;
  private voiceVolume = 0.9;
  private voiceMode: VoiceMode = 'radio';
  private activeInputDeviceId = 'default';

  private rtcConfig: RTCConfiguration;
  private sendSignal: (targetId: string, signal: unknown) => void;
  private onMicStatusChange: (enabled: boolean, error?: string) => void;
  private onDiagnostics?: (snap: VoiceDiagnosticsSnapshot) => void;
  private lastDiagnosticsEmitMs = 0;

  constructor(
    sendSignal: (targetId: string, signal: unknown) => void,
    onMicStatusChange: (enabled: boolean, error?: string) => void,
    onDiagnostics?: (snap: VoiceDiagnosticsSnapshot) => void
  ) {
    this.sendSignal = sendSignal;
    this.onMicStatusChange = onMicStatusChange;
    this.onDiagnostics = onDiagnostics;

    const envJson = (
      import.meta as unknown as { env?: { VITE_WEBRTC_ICE_SERVERS_JSON?: string } }
    )?.env?.VITE_WEBRTC_ICE_SERVERS_JSON;
    this.rtcConfig = {
      iceServers: parseIceServersConfig(envJson),
      iceCandidatePoolSize: 4,
    };
  }

  private ensureAudioCtx(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) this.audioCtx = new Ctx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private buildAudioConstraints(deviceId?: string): MediaTrackConstraints {
    const base: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
    };
    const chosen = deviceId ?? this.activeInputDeviceId;
    if (chosen && chosen !== 'default') {
      base.deviceId = { exact: chosen };
    }
    return base;
  }

  private attachLocalAnalyser(stream: MediaStream): void {
    const ctx = this.ensureAudioCtx();
    if (!ctx) return;
    try {
      this.localSource?.disconnect();
    } catch {
      // ignore disconnect error
    }
    try {
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      this.localSource = src;
      this.localAnalyser = analyser;
      this.localFreqBuffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      this.localSource = null;
      this.localAnalyser = null;
      this.localFreqBuffer = null;
    }
  }

  private async acquireMicrophoneStream(preferredDeviceId?: string): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('UNAVAILABLE');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: this.buildAudioConstraints(preferredDeviceId),
        video: false,
      });
    } catch (err) {
      // If an explicit device constraint failed (e.g. unplugged headset), fall back to system default
      const target = preferredDeviceId ?? this.activeInputDeviceId;
      if (target && target !== 'default') {
        this.activeInputDeviceId = 'default';
        return await navigator.mediaDevices.getUserMedia({
          audio: this.buildAudioConstraints('default'),
          video: false,
        });
      }
      throw err;
    }
  }

  public async getAudioInputDevices(): Promise<VoiceAudioDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      return inputs.map((d, idx) => ({
        deviceId: d.deviceId || 'default',
        label: d.label.trim() || `Microphone ${idx + 1}`,
      }));
    } catch {
      return [];
    }
  }

  public async setInputDevice(deviceId: string): Promise<boolean> {
    this.activeInputDeviceId = deviceId || 'default';
    if (!this.micEnabled) {
      this.emitDiagnostics(true);
      return true;
    }
    try {
      const nextStream = await this.acquireMicrophoneStream(this.activeInputDeviceId);
      const nextTrack = nextStream.getAudioTracks()[0];
      if (!nextTrack) return false;

      const oldStream = this.localStream;
      this.localStream = nextStream;
      this.syncMicTracks();
      this.attachLocalAnalyser(nextStream);

      for (const [, entry] of this.peers) {
        const audioSender = entry.pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(nextTrack);
        } else {
          entry.pc.addTrack(nextTrack, nextStream);
        }
      }

      if (oldStream) {
        oldStream.getTracks().forEach((t) => t.stop());
      }
      this.emitDiagnostics(true);
      return true;
    } catch {
      this.onMicStatusChange(false, 'Unable to switch microphone input device.');
      return false;
    }
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.micEnabled = false;
      this.localSmoothedLevel = 0;
      this.syncMicTracks();
      this.onMicStatusChange(false);
      this.emitDiagnostics(true);
      return false;
    }

    this.ensureAudioCtx();

    try {
      if (!this.localStream) {
        this.localStream = await this.acquireMicrophoneStream(this.activeInputDeviceId);
        this.attachLocalAnalyser(this.localStream);
        for (const [, entry] of this.peers) {
          const existingSenders = entry.pc.getSenders().filter((s) => s.track?.kind === 'audio');
          const track = this.localStream.getAudioTracks()[0];
          if (track) {
            if (existingSenders.length > 0) {
              await existingSenders[0].replaceTrack(track);
            } else {
              entry.pc.addTrack(track, this.localStream);
            }
          }
        }
      }
      this.micEnabled = true;
      this.syncMicTracks();
      this.onMicStatusChange(true);
      this.emitDiagnostics(true);
      return true;
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'UNAVAILABLE'
          ? 'Microphone API unavailable in this browser.'
          : 'Microphone permission denied or no microphone detected.';
      this.micEnabled = false;
      this.onMicStatusChange(false, msg);
      this.emitDiagnostics(true);
      return false;
    }
  }

  public setPushToTalkMode(ptt: boolean): void {
    this.pushToTalkMode = ptt;
    this.syncMicTracks();
    this.emitDiagnostics(true);
  }

  public setPushToTalkHeld(held: boolean): void {
    this.pushToTalkHeld = held;
    this.syncMicTracks();
  }

  public setVoiceVolume(vol: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
  }

  public setVoiceMode(mode: VoiceMode): void {
    this.voiceMode = mode;
    this.emitDiagnostics(true);
  }

  public setPeerMuted(playerId: string, muted: boolean): void {
    const entry = this.peers.get(playerId);
    if (entry) {
      entry.muted = muted;
      if (entry.gainNode && this.audioCtx) {
        entry.gainNode.gain.setTargetAtTime(
          muted ? 0 : this.voiceVolume,
          this.audioCtx.currentTime,
          0.04
        );
      } else {
        entry.audioEl.muted = muted;
      }
      this.emitDiagnostics(true);
    }
  }

  public isPeerMuted(playerId: string): boolean {
    return this.peers.get(playerId)?.muted ?? false;
  }

  public reconnectPeer(playerId: string): void {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    entry.connectionState = 'reconnecting';
    entry.lastRestartAttemptMs = performance.now();
    try {
      entry.pc.restartIce();
    } catch {
      // Fallback: recreate offer manually
      void this.initiateOffer(playerId, entry, true);
    }
    this.emitDiagnostics(true);
  }

  private syncMicTracks(): void {
    if (!this.localStream) return;
    const active = this.micEnabled && (!this.pushToTalkMode || this.pushToTalkHeld);
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = active;
    }
  }

  public syncPeers(localPlayerId: string, teammates: NetworkPlayerState[]): void {
    this.localPlayerId = localPlayerId;
    const activeIds = new Set(
      teammates.filter((p) => p.connected && p.playerId !== localPlayerId).map((p) => p.playerId)
    );

    // Remove departed peers
    for (const [id, entry] of this.peers) {
      if (!activeIds.has(id)) {
        this.cleanupPeerEntry(entry);
        this.peers.delete(id);
      }
    }

    // Create connections for new peers; impolite peer (lower ID) proactively opens channel
    // so receive-only players can immediately hear speaking teammates even without a local mic.
    for (const peerId of activeIds) {
      if (!this.peers.has(peerId)) {
        const entry = this.createPeerEntry(peerId);
        if (!isPoliteVoicePeer(localPlayerId, peerId)) {
          try {
            entry.pc.addTransceiver('audio', { direction: 'sendrecv' });
          } catch {
            // ignore if track already added
          }
          void this.initiateOffer(peerId, entry);
        }
      }
    }
    this.emitDiagnostics(true);
  }

  private cleanupPeerEntry(entry: PeerAudioEntry): void {
    try {
      entry.sourceNode?.disconnect();
      entry.highpassNode?.disconnect();
      entry.presenceNode?.disconnect();
      entry.lowpassNode?.disconnect();
      entry.compressorNode?.disconnect();
      entry.gainNode?.disconnect();
      entry.analyserNode?.disconnect();
    } catch {
      // ignore audio node cleanup errors
    }
    try {
      entry.pc.close();
    } catch {
      // ignore close errors
    }
    entry.audioEl.srcObject = null;
  }

  private createPeerEntry(peerId: string): PeerAudioEntry {
    const pc = new RTCPeerConnection(this.rtcConfig);
    const audioEl = new Audio();
    audioEl.autoplay = true;
    (audioEl as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;

    const entry: PeerAudioEntry = {
      peerId,
      pc,
      audioEl,
      sourceNode: null,
      highpassNode: null,
      presenceNode: null,
      lowpassNode: null,
      compressorNode: null,
      gainNode: null,
      analyserNode: null,
      freqBuffer: null,
      pendingCandidates: [],
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      connectionState: 'connecting',
      muted: false,
      receivingAudio: false,
      lastDistanceMeters: 0,
      lastWallsBetween: 0,
      lastRestartAttemptMs: 0,
      smoothedLevel: 0,
    };

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onnegotiationneeded = () => {
      if (entry.makingOffer || pc.signalingState !== 'stable') return;
      void this.initiateOffer(peerId, entry);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal(peerId, { candidate: e.candidate.toJSON?.() ?? e.candidate });
      }
    };

    const updateConnState = () => {
      const ice = pc.iceConnectionState;
      const conn = pc.connectionState;
      if (conn === 'connected' || ice === 'connected' || ice === 'completed') {
        entry.connectionState = 'connected';
      } else if (conn === 'failed' || ice === 'failed') {
        entry.connectionState = 'failed';
        const now = performance.now();
        if (now - entry.lastRestartAttemptMs > 6000) {
          entry.lastRestartAttemptMs = now;
          entry.connectionState = 'reconnecting';
          try {
            pc.restartIce();
          } catch {
            // ignore
          }
        }
      } else if (ice === 'disconnected') {
        entry.connectionState = 'reconnecting';
      } else if (conn === 'closed') {
        entry.connectionState = 'idle';
      } else {
        entry.connectionState = 'connecting';
      }
      this.emitDiagnostics(true);
    };

    pc.oniceconnectionstatechange = updateConnState;
    pc.onconnectionstatechange = updateConnState;

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      if (!stream) return;
      entry.receivingAudio = true;
      audioEl.srcObject = stream;
      // Chromium requires audio element playback unlocked (even muted) to keep WebRTC jitter buffer flowing into MediaStreamSource
      audioEl.muted = true;
      void audioEl.play().catch(() => {});

      const ctx = this.ensureAudioCtx();
      if (ctx) {
        try {
          entry.sourceNode?.disconnect();
          const src = ctx.createMediaStreamSource(stream);

          const highpass = ctx.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 85;
          highpass.Q.value = 0.7;

          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 2800;
          presence.Q.value = 1.1;
          presence.gain.value = 2.5;

          const lowpass = ctx.createBiquadFilter();
          lowpass.type = 'lowpass';
          lowpass.frequency.value = 14000;

          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.value = -20;
          compressor.knee.value = 12;
          compressor.ratio.value = 4;
          compressor.attack.value = 0.005;
          compressor.release.value = 0.14;

          const gain = ctx.createGain();
          gain.gain.value = entry.muted ? 0 : this.voiceVolume;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.62;

          src.connect(highpass);
          highpass.connect(presence);
          presence.connect(lowpass);
          lowpass.connect(compressor);
          compressor.connect(gain);
          gain.connect(analyser);
          analyser.connect(ctx.destination);

          entry.sourceNode = src;
          entry.highpassNode = highpass;
          entry.presenceNode = presence;
          entry.lowpassNode = lowpass;
          entry.compressorNode = compressor;
          entry.gainNode = gain;
          entry.analyserNode = analyser;
          entry.freqBuffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        } catch {
          // Graceful fallback if Web Audio graph creation fails
          audioEl.muted = entry.muted;
          audioEl.volume = entry.muted ? 0 : this.voiceVolume;
        }
      } else {
        audioEl.muted = entry.muted;
        audioEl.volume = entry.muted ? 0 : this.voiceVolume;
      }
      this.emitDiagnostics(true);
    };

    this.peers.set(peerId, entry);
    return entry;
  }

  private async initiateOffer(
    peerId: string,
    entry: PeerAudioEntry,
    iceRestart = false
  ): Promise<void> {
    try {
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      if (entry.pc.signalingState !== 'stable' && !iceRestart) return;
      await entry.pc.setLocalDescription(offer);
      if (entry.pc.localDescription) {
        this.sendSignal(peerId, {
          sdp: {
            type: entry.pc.localDescription.type,
            sdp: entry.pc.localDescription.sdp,
          },
        });
      }
    } catch {
      // Ignore transient signaling races
    } finally {
      entry.makingOffer = false;
    }
  }

  private async flushPendingCandidates(entry: PeerAudioEntry): Promise<void> {
    if (!entry.pc.remoteDescription || entry.pendingCandidates.length === 0) return;
    const queued = entry.pendingCandidates.splice(0, entry.pendingCandidates.length);
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates after renegotiation
      }
    }
  }

  public async handleSignal(fromPlayerId: string, signal: unknown): Promise<void> {
    const sig = signal as {
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    };
    let entry = this.peers.get(fromPlayerId);
    if (!entry) {
      entry = this.createPeerEntry(fromPlayerId);
    }

    const polite = isPoliteVoicePeer(this.localPlayerId, fromPlayerId);

    try {
      if (sig.sdp) {
        const readyForOffer =
          !entry.makingOffer &&
          (entry.pc.signalingState === 'stable' || entry.isSettingRemoteAnswerPending);
        const offerCollision = sig.sdp.type === 'offer' && !readyForOffer;

        entry.ignoreOffer = !polite && offerCollision;
        if (entry.ignoreOffer) {
          return;
        }

        entry.isSettingRemoteAnswerPending = sig.sdp.type === 'answer';
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        entry.isSettingRemoteAnswerPending = false;
        await this.flushPendingCandidates(entry);

        if (sig.sdp.type === 'offer') {
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          if (entry.pc.localDescription) {
            this.sendSignal(fromPlayerId, {
              sdp: {
                type: entry.pc.localDescription.type,
                sdp: entry.pc.localDescription.sdp,
              },
            });
          }
        }
      } else if (sig.candidate) {
        if (!entry.pc.remoteDescription) {
          if (entry.pendingCandidates.length < 48) {
            entry.pendingCandidates.push(sig.candidate);
          }
          return;
        }
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
        } catch {
          if (!entry.ignoreOffer) {
            // Swallow transient candidate mismatch
          }
        }
      }
    } catch {
      entry.isSettingRemoteAnswerPending = false;
    }
  }

  private measureAnalyserLevel(
    analyser: AnalyserNode | null,
    buf: Uint8Array<ArrayBuffer> | null
  ): number {
    if (!analyser || !buf) return 0;
    analyser.getByteFrequencyData(buf);
    let sumSq = 0;
    // Focus on vocal fundamental/formant bins
    const limit = Math.min(buf.length, 48);
    for (let i = 1; i < limit; i++) {
      const norm = buf[i] / 255;
      sumSq += norm * norm;
    }
    return limit > 1 ? Math.min(1, Math.sqrt(sumSq / (limit - 1)) * 1.45) : 0;
  }

  /**
   * Updates Radio/Spatial gain, wall-muffling filter, and samples vocal level telemetry.
   */
  public updateSpatialAudio(
    localPos: { x: number; y: number; z: number },
    peers: NetworkPlayerState[],
    colliders: ColliderBox[],
    inLobby: boolean
  ): void {
    const ctx = this.audioCtx;
    for (const p of peers) {
      const entry = this.peers.get(p.playerId);
      if (!entry) continue;

      if (entry.muted) {
        if (entry.gainNode && ctx) {
          entry.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
        } else {
          entry.audioEl.muted = true;
        }
        entry.lastDistanceMeters = 0;
        entry.lastWallsBetween = 0;
        continue;
      }

      if (inLobby) {
        entry.lastDistanceMeters = 0;
        entry.lastWallsBetween = 0;
        if (entry.gainNode && entry.lowpassNode && ctx) {
          entry.gainNode.gain.setTargetAtTime(this.voiceVolume, ctx.currentTime, 0.05);
          entry.lowpassNode.frequency.setTargetAtTime(14000, ctx.currentTime, 0.05);
        } else {
          entry.audioEl.muted = false;
          entry.audioEl.volume = this.voiceVolume;
        }
        continue;
      }

      const dist = Math.hypot(
        p.position.x - localPos.x,
        p.position.y - localPos.y,
        p.position.z - localPos.z
      );
      const walls = countWallsBetween(localPos, p.position, colliders);
      entry.lastDistanceMeters = Number(dist.toFixed(1));
      entry.lastWallsBetween = walls;

      const { gain, lowpassHz } = computeVoiceModeMix(
        this.voiceMode,
        dist,
        walls,
        this.voiceVolume
      );

      if (entry.gainNode && entry.lowpassNode && ctx) {
        entry.gainNode.gain.setTargetAtTime(gain, ctx.currentTime, 0.06);
        entry.lowpassNode.frequency.setTargetAtTime(lowpassHz, ctx.currentTime, 0.06);
      } else {
        entry.audioEl.muted = false;
        entry.audioEl.volume = gain;
      }
    }

    this.emitDiagnostics(false);
  }

  public getDiagnosticsSnapshot(): VoiceDiagnosticsSnapshot {
    const activeTx = this.micEnabled && (!this.pushToTalkMode || this.pushToTalkHeld);
    const rawLocal = activeTx
      ? this.measureAnalyserLevel(this.localAnalyser, this.localFreqBuffer)
      : 0;
    this.localSmoothedLevel = this.localSmoothedLevel * 0.55 + rawLocal * 0.45;

    const peerTelemetry: Record<string, PeerVoiceTelemetry> = {};
    for (const [peerId, entry] of this.peers) {
      const rawPeer =
        entry.muted || entry.connectionState === 'failed'
          ? 0
          : this.measureAnalyserLevel(entry.analyserNode, entry.freqBuffer);
      entry.smoothedLevel = entry.smoothedLevel * 0.55 + rawPeer * 0.45;
      peerTelemetry[peerId] = {
        playerId: peerId,
        connectionState: entry.connectionState,
        speaking: entry.smoothedLevel >= SPEAK_THRESHOLD,
        audioLevel: Number(entry.smoothedLevel.toFixed(2)),
        distanceMeters: entry.lastDistanceMeters,
        wallsBetween: entry.lastWallsBetween,
        muted: entry.muted,
        receivingAudio: entry.receivingAudio,
      };
    }

    return {
      localMicLevel: Number(this.localSmoothedLevel.toFixed(2)),
      localSpeaking: activeTx && this.localSmoothedLevel >= SPEAK_THRESHOLD,
      voiceMode: this.voiceMode,
      activeInputDeviceId: this.activeInputDeviceId,
      peers: peerTelemetry,
    };
  }

  private emitDiagnostics(force: boolean): void {
    if (!this.onDiagnostics) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - this.lastDiagnosticsEmitMs < 110) return;
    this.lastDiagnosticsEmitMs = now;
    this.onDiagnostics(this.getDiagnosticsSnapshot());
  }

  public dispose(): void {
    for (const [, entry] of this.peers) {
      this.cleanupPeerEntry(entry);
    }
    this.peers.clear();
    try {
      this.localSource?.disconnect();
      this.localAnalyser?.disconnect();
    } catch {
      // ignore
    }
    this.localSource = null;
    this.localAnalyser = null;
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    try {
      void this.audioCtx?.close();
    } catch {
      // ignore
    }
    this.audioCtx = null;
  }
}
