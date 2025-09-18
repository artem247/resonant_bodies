export class LFO {
  constructor(freq = 0.2, depth = 0.2, sampleRate = 48000) {
    this.phase = 0;
    this.freq = freq;
    this.depth = depth;
    this.sampleRate = sampleRate;
  }
  step() {
    const value = Math.sin(this.phase) * this.depth;
    this.phase += (2 * Math.PI * this.freq) / this.sampleRate;
    if (this.phase > Math.PI) this.phase -= 2 * Math.PI;
    return value;
  }
}
