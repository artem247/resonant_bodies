import { Config } from "../core/config.js";

export class SpatialProcessor {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.listenerPosition = [0, 0, 1];
        this.panCoefficients = new Float32Array(Config.audio.maxResonators * 2);
        this.updatePanning();
    }

    updatePanning() {
        const count = Config.audio.maxResonators;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const pan = (angle / Math.PI + 1) * 0.5;
            this.panCoefficients[i * 2] = Math.sqrt(1 - pan);
            this.panCoefficients[i * 2 + 1] = Math.sqrt(pan);
        }
    }

    process(resonatorOutputs) {
        let left = 0;
        let right = 0;
        const count = Config.audio.maxResonators;

        for (let i = 0; i < count; i++) {
            left += resonatorOutputs[i] * this.panCoefficients[i * 2];
            right += resonatorOutputs[i] * this.panCoefficients[i * 2 + 1];
        }

        return [left, right];
    }
}
