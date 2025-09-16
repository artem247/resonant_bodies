import { clamp } from "../core/math-utils.js";

export class DelayLine {
    constructor(maxDelay) {
        this.buffer = new Float32Array(maxDelay);
        this.writeIdx = 0;
        this.delaySamples = Math.floor(maxDelay / 2);
        this.maxDelay = maxDelay;
    }

    read() {
        const readIdx =
            (this.writeIdx + this.buffer.length - this.delaySamples) %
            this.buffer.length;
        return this.buffer[readIdx];
    }

    write(sample) {
        this.buffer[this.writeIdx] = sample;
        this.writeIdx = (this.writeIdx + 1) % this.buffer.length;
    }

    setDelay(samples) {
        this.delaySamples = clamp(Math.floor(samples), 1, this.buffer.length - 1);
    }

    reset() {
        this.buffer.fill(0);
        this.writeIdx = 0;
    }
}
