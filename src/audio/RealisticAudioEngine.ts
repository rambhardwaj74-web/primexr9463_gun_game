import { WeaponCategory } from '../types/game';

/**
 * Authentic Procedural Firearm Audio Synthesizer
 * Built using multi-layer Web Audio API DSP architecture:
 * 1. Concussive Sub-Bass Blast (40-120Hz physical punch)
 * 2. Supersonic Transient Crack & High-Pressure Gas Muzzle Report
 * 3. Metallic Mechanical Action (Slide/Bolt cycle & buffer spring)
 * 4. Stereo Environmental Reverb Tail & Slapback Reflections
 * 5. Spent Brass Casing Ground Ping
 * 6. Supersonic Bullet Flyby Snick-Crack
 */
export class RealisticAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Initialized on first user interaction
  }

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.generateNoiseBuffers();
    this.generateImpulseResponse();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private generateNoiseBuffers(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Procedural outdoor battlefield impulse response for natural canyon / hillside acoustic decay
   */
  private generateImpulseResponse(): void {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = rate * 1.5;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const decay = Math.exp(-t * 6.5);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = impulse;
  }

  /**
   * Main Weapon Shot Audio Pipeline with multi-layered acoustic synthesis
   */
  public playWeaponShot(category: WeaponCategory, isSniper: boolean = false, isSilenced: boolean = false): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Layer 1: Concussive Sub-Bass Blast (Chest Thump)
    this.synthesizeConcussionThump(now, category, isSniper);

    // Layer 2: Supersonic Transient & High-Pressure Gas Crack
    this.synthesizeMuzzleCrack(now, category, isSniper, isSilenced);

    // Layer 3: Mechanical Action (Slide/Bolt cycle & firing pin click)
    this.synthesizeMechanicalAction(now, category, isSniper);

    // Layer 4: Environmental Tail & Terrain Slapback Echo
    this.synthesizeEchoTail(now, category, isSniper);
  }

  /**
   * Concussive sub-bass body thump
   */
  private synthesizeConcussionThump(t: number, cat: WeaponCategory, isSniper: boolean): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let startFreq = 110;
    let endFreq = 28;
    let duration = 0.12;
    let volume = 0.85;

    if (isSniper) {
      startFreq = 160;
      endFreq = 22;
      duration = 0.22;
      volume = 1.0;
    } else if (cat === 'shotgun') {
      startFreq = 140;
      endFreq = 24;
      duration = 0.18;
      volume = 0.95;
    } else if (cat === 'pistol') {
      startFreq = 95;
      endFreq = 38;
      duration = 0.08;
      volume = 0.55;
    } else if (cat === 'smg') {
      startFreq = 105;
      endFreq = 34;
      duration = 0.07;
      volume = 0.65;
    } else if (cat === 'heavy') {
      startFreq = 190;
      endFreq = 18;
      duration = 0.26;
      volume = 1.1;
    }

    osc.type = isSniper || cat === 'shotgun' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  /**
   * Supersonic transient crack & high-pressure powder burn
   */
  private synthesizeMuzzleCrack(t: number, cat: WeaponCategory, isSniper: boolean, isSilenced: boolean): void {
    if (!this.ctx || !this.noiseBuffer || !this.masterGain) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter1 = this.ctx.createBiquadFilter();
    const filter2 = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    let centerFreq = 3200;
    let qFactor = 4.2;
    let duration = 0.18;
    let volume = 0.9;

    if (isSniper) {
      centerFreq = 4200;
      qFactor = 5.5;
      duration = 0.38;
      volume = 1.1;
    } else if (cat === 'shotgun') {
      centerFreq = 1800;
      qFactor = 2.0;
      duration = 0.25;
      volume = 1.0;
    } else if (cat === 'pistol') {
      centerFreq = 2800;
      qFactor = 3.5;
      duration = 0.11;
      volume = 0.7;
    } else if (cat === 'smg') {
      centerFreq = 3600;
      qFactor = 3.8;
      duration = 0.10;
      volume = 0.75;
    } else if (cat === 'heavy') {
      centerFreq = 2200;
      qFactor = 3.0;
      duration = 0.42;
      volume = 1.2;
    }

    if (isSilenced) {
      centerFreq = 1100;
      volume *= 0.35;
      duration *= 0.6;
    }

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(centerFreq, t);
    filter1.frequency.exponentialRampToValueAtTime(220, t + duration);
    filter1.Q.setValueAtTime(qFactor, t);

    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(8000, t);
    filter2.frequency.exponentialRampToValueAtTime(500, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + duration);

    noise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration + 0.02);
  }

  /**
   * Metallic slide / bolt carrier blowback & return cycle
   */
  private synthesizeMechanicalAction(t: number, cat: WeaponCategory, isSniper: boolean): void {
    if (!this.ctx || !this.masterGain) return;

    // Metallic click 1: Firing pin & chamber unseating (t + 0.015s)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1400, t + 0.012);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.038);
    gain1.gain.setValueAtTime(0.25, t + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.038);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t + 0.012);
    osc1.stop(t + 0.04);

    // Metallic click 2: Bolt carrier hitting buffer and chambering next round (t + 0.055s)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    const boltFreq = isSniper ? 580 : (cat === 'shotgun' ? 440 : 880);
    osc2.frequency.setValueAtTime(boltFreq, t + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(160, t + 0.095);
    gain2.gain.setValueAtTime(0.22, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.1);
  }

  /**
   * Environmental slapback echo & battlefield reverberation
   */
  private synthesizeEchoTail(t: number, cat: WeaponCategory, isSniper: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Delay-based canyon echo
    const delay = this.ctx.createDelay();
    delay.delayTime.setValueAtTime(isSniper ? 0.16 : 0.09, t);

    const feedback = this.ctx.createGain();
    feedback.gain.setValueAtTime(isSniper ? 0.42 : 0.28, t);

    const dampFilter = this.ctx.createBiquadFilter();
    dampFilter.type = 'lowpass';
    dampFilter.frequency.setValueAtTime(isSniper ? 1800 : 1200, t);

    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(isSniper ? 0.35 : 0.2, t);
    tailGain.gain.exponentialRampToValueAtTime(0.0001, t + (isSniper ? 0.95 : 0.45));

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    noise.connect(dampFilter);
    dampFilter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(tailGain);
    tailGain.connect(this.masterGain);

    noise.start(t + 0.02);
    noise.stop(t + (isSniper ? 0.98 : 0.48));
  }

  /**
   * Spent brass shell casing ground impact clatter
   */
  public playSpentShellCasing(surfaceType: 'dirt' | 'metal' | 'wood' = 'dirt'): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 2-3 randomized metallic tinks
    const bounces = Math.floor(Math.random() * 2) + 2;
    let delayAcc = 0.05 + Math.random() * 0.05;

    for (let i = 0; i < bounces; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + delayAcc;

      // Resonant ping between 2800Hz - 4200Hz
      const pingFreq = 2800 + Math.random() * 1400;
      osc.type = surfaceType === 'metal' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(pingFreq, t);
      osc.frequency.exponentialRampToValueAtTime(pingFreq * 0.65, t + 0.045);

      const vol = (0.16 / (i + 1)) * (0.8 + Math.random() * 0.4);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      if (this.masterGain) gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.05);

      delayAcc += 0.07 + Math.random() * 0.08;
    }
  }

  /**
   * Supersonic bullet flyby whip / near-miss snap
   * Plays when an enemy projectile whizzes within 2.5 meters of the player's head
   */
  public playSupersonicFlyby(pan: number = 0): void {
    if (!this.ctx || this.isMuted || !this.noiseBuffer || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4800, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.065);
    filter.Q.setValueAtTime(6.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.075);
  }

  /**
   * Spatial 3D Gunshot for AI bots firing from a distance
   */
  public playSpatialBotGunshot(botPos: { x: number; y: number; z: number }, playerPos: { x: number; y: number; z: number }, playerYaw: number): void {
    if (!this.ctx || this.isMuted || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const dx = botPos.x - playerPos.x;
    const dz = botPos.z - playerPos.z;
    const dist = Math.hypot(dx, dz);

    // Realistic distance volume rolloff (inverse square law approximation)
    const maxAudibleDist = 140;
    if (dist > maxAudibleDist) return;

    const vol = Math.max(0.04, Math.min(0.85, 1.0 - Math.pow(dist / maxAudibleDist, 0.75)));

    // Calculate relative horizontal angle for stereo panning
    const angleToBot = Math.atan2(dx, dz);
    const relAngle = angleToBot - playerYaw;
    const pan = Math.sin(relAngle);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

    // Lowpass filter frequency drops with distance due to atmospheric sound absorption
    const airAbsorptionCutoff = Math.max(700, 7500 - dist * 48);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(airAbsorptionCutoff, now);

    // Thump component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
    oscGain.gain.setValueAtTime(vol * 0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(oscGain);
    oscGain.connect(filter);

    // Crack component
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(noiseGain);
    noiseGain.connect(filter);

    filter.connect(panner);
    panner.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
    noise.start(now);
    noise.stop(now + 0.13);
  }

  /**
   * Target impact hit marker audio: distinct tactile metallic / flesh thud
   */
  public playHitConfirmed(isHeadshot: boolean = false): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isHeadshot ? 1760 : 1240;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.06);

    gain.gain.setValueAtTime(isHeadshot ? 0.38 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Reload stage 1: Magazine release / out
   */
  public playReloadMagOut(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Reload stage 2: Fresh magazine slapped into magwell
   */
  public playReloadMagIn(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.13);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Reload stage 3: Slide release / bolt cocking lock
   */
  public playReloadBolt(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.11);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Tactile footstep sound
   */
  public playFootstep(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(22, now + 0.055);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Wood fortification placement sound
   */
  public playBuildWall(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.17);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Material collection chime
   */
  public playCollect(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(940, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Wall damage impact sound
   */
  public playWoodImpact(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Nano-medkit stim injection audio
   */
  public playMedkitUse(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523, 659, 784, 1046].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.1 + i * 0.11);
      gain.gain.setValueAtTime(0.18, now + 0.1 + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.11);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + 0.1 + i * 0.11);
      osc.stop(now + 0.45 + i * 0.11);
    });
  }
}

export const audioEngine = new RealisticAudioEngine();
