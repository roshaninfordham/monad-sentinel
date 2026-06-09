type SoundName = "join" | "verified" | "batchCommitted" | "tamper" | "offline" | "swarmComplete";

class SoundEngineImpl {
  private context: AudioContext | null = null;
  private enabled = false;
  private master: GainNode | null = null;
  private lastPlayed: Partial<Record<SoundName, number>> = {};

  async initFromUserGesture() {
    if (typeof window === "undefined") return;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (!this.context) {
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.enabled = true;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  playJoin() {
    if (!this.canPlay("join", 250)) return;
    this.tone(720, 0.08, "sine", 0.8, 0.02);
  }

  playVerified() {
    if (!this.canPlay("verified", 160)) return;
    this.tone(640, 0.09, "sine", 0.55, 0);
    window.setTimeout(() => this.tone(920, 0.1, "sine", 0.45, 0), 75);
  }

  playBatchCommitted() {
    if (!this.canPlay("batchCommitted", 180)) return;
    this.tone(120, 0.18, "triangle", 0.85, 0);
    window.setTimeout(() => this.tone(1180, 0.08, "sine", 0.35, 0), 110);
  }

  playTamper() {
    if (!this.canPlay("tamper", 300)) return;
    this.tone(180, 0.08, "sawtooth", 0.9, 0);
    window.setTimeout(() => this.tone(90, 0.16, "sawtooth", 0.65, 0), 85);
  }

  playOffline() {
    if (!this.canPlay("offline", 120)) return;
    this.tone(92, 0.12, "triangle", 0.55, 0);
  }

  playSwarmComplete() {
    if (!this.canPlay("swarmComplete", 1000)) return;
    [440, 554, 660, 880].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.15, "sine", 0.42, 0), index * 105);
    });
  }

  private canPlay(name: SoundName, debounceMs: number) {
    if (!this.enabled || !this.context || !this.master) return false;
    const now = performance.now();
    if ((this.lastPlayed[name] ?? 0) + debounceMs > now) return false;
    this.lastPlayed[name] = now;
    return true;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, gainValue: number, detune: number) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    oscillator.type = type;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

export const SoundEngine = new SoundEngineImpl();
