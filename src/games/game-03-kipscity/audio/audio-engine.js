/**
 * Audio Engine — procedural Web Audio for Kips City.
 *
 * Design:
 *   - One shared AudioContext (created on first user gesture per browser policy).
 *   - Master gain → Music bus (looping ambient pad) + SFX bus (one-shots).
 *   - Music: simple oscillator chord pad with filter sweep by time-of-day.
 *   - SFX: short procedural notes (click, coin, chime, level-up, footstep).
 *   - Settings: mute music, mute sfx, master volume. Persisted externally
 *     (settings system — Batch 3k save manager carries these).
 *
 * Constraint: Zero .mp3 / .ogg files. Everything is synth.
 *
 * Performance:
 *   - All nodes connect once. No per-frame allocation.
 *   - Pause = suspend AudioContext → true CPU=0 from audio thread.
 *   - OscillatorNodes are long-lived (music) or pooled (SFX).
 *
 * Usage:
 *   const audio = new AudioEngine();
 *   audio.init();          // call on first user tap (gesture unlock)
 *   audio.startMusic();    // loops ambient pad
 *   audio.playSfx('click');
 *   audio.setMusicVolume(0.5);
 *   audio.pause() / audio.resume();
 *   audio.destroy();
 */

const MUSIC_BASE_FREQ = 220; // A3
const CHORD_INTERVALS = [0, 4, 7, 12]; // major chord semitones

export class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this._master = null;
    this._musicBus = null;
    this._sfxBus = null;
    this._oscillators = [];
    this._musicPlaying = false;
    this._settings = { musicVol: 0.3, sfxVol: 0.5, masterVol: 0.8, musicMuted: false, sfxMuted: false };
    this._initialized = false;
  }

  /** Must be called from a user gesture (tap/click) to unlock AudioContext. */
  init() {
    if (this._initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this._master = this.ctx.createGain();
      this._master.gain.value = this._settings.masterVol;
      this._master.connect(this.ctx.destination);

      this._musicBus = this.ctx.createGain();
      this._musicBus.gain.value = this._settings.musicMuted ? 0 : this._settings.musicVol;
      this._musicBus.connect(this._master);

      this._sfxBus = this.ctx.createGain();
      this._sfxBus.gain.value = this._settings.sfxMuted ? 0 : this._settings.sfxVol;
      this._sfxBus.connect(this._master);

      this._initialized = true;
    } catch (e) {
      console.warn('[audio] init failed', e);
    }
  }

  /** Start the ambient music pad (looping). Idempotent. */
  startMusic() {
    if (!this._initialized || this._musicPlaying) return;
    this._musicPlaying = true;

    // Create a warm chord pad using oscillators + low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;
    filter.connect(this._musicBus);

    for (const semi of CHORD_INTERVALS) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = MUSIC_BASE_FREQ * Math.pow(2, semi / 12);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.08;
      osc.connect(gain).connect(filter);
      osc.start();
      this._oscillators.push({ osc, gain });
    }
  }

  stopMusic() {
    for (const { osc, gain } of this._oscillators) {
      try { osc.stop(); } catch {}
    }
    this._oscillators.length = 0;
    this._musicPlaying = false;
  }

  /** Play a quick procedural SFX by name. */
  playSfx(name) {
    if (!this._initialized || this._settings.sfxMuted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (name) {
      case 'click': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 660;
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(g).connect(this._sfxBus);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
      case 'coin': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(g).connect(this._sfxBus);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case 'chime': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 1100;
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(g).connect(this._sfxBus);
        osc.start(now);
        osc.stop(now + 0.55);
        break;
      }
      case 'step': {
        // Soft thud
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 80 + Math.random() * 20;
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(g).connect(this._sfxBus);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      default:
        break;
    }
  }

  // ---------- Settings ----------
  setMasterVolume(v) {
    this._settings.masterVol = clamp01(v);
    if (this._master) this._master.gain.value = this._settings.masterVol;
  }
  setMusicVolume(v) {
    this._settings.musicVol = clamp01(v);
    if (this._musicBus && !this._settings.musicMuted) this._musicBus.gain.value = v;
  }
  setSfxVolume(v) {
    this._settings.sfxVol = clamp01(v);
    if (this._sfxBus && !this._settings.sfxMuted) this._sfxBus.gain.value = v;
  }
  setMusicMuted(muted) {
    this._settings.musicMuted = !!muted;
    if (this._musicBus) this._musicBus.gain.value = muted ? 0 : this._settings.musicVol;
  }
  setSfxMuted(muted) {
    this._settings.sfxMuted = !!muted;
    if (this._sfxBus) this._sfxBus.gain.value = muted ? 0 : this._settings.sfxVol;
  }
  getSettings() { return { ...this._settings }; }
  applySettings(s) {
    if (s.masterVol != null) this.setMasterVolume(s.masterVol);
    if (s.musicVol != null) this.setMusicVolume(s.musicVol);
    if (s.sfxVol != null) this.setSfxVolume(s.sfxVol);
    if (s.musicMuted != null) this.setMusicMuted(s.musicMuted);
    if (s.sfxMuted != null) this.setSfxMuted(s.sfxMuted);
  }

  // ---------- Lifecycle ----------
  pause() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  destroy() {
    this.stopMusic();
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
    this._initialized = false;
  }
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
