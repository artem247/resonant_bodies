import { Config } from "../core/config.js";
import { DelayLine } from "./delay-line.js";
import { OnePoleFilter } from "./filters/one-pole.js";
import { ExcitationModel } from "../physics/excitation-models.js";
import {
    calculateDelaySamples,
    delayFromFrequency,
    frequencyFromNote,
} from "../physics/wave-physics.js";

export class Resonator {
    constructor(id, position, sampleRate, options = {}) {
        this.id = id;
        this.position = position;
        this.sampleRate = sampleRate;

        const maxDelayMs = options.maxDelayMs ?? Config.audio.maxDelayMs;
        const maxDelaySamples = Math.ceil((maxDelayMs / 1000) * sampleRate);
        this.forwardDelay = new DelayLine(maxDelaySamples);
        this.backwardDelay = new DelayLine(maxDelaySamples);

        const defaults = Config.physics.defaultMaterial;
        this.baseDamping = options.baseDamping ?? defaults.damping;
        this.stiffness = options.stiffness ?? defaults.stiffness;
        this.energy = 0;
        this.energySmoothing =
            options.energySmoothing ?? Config.audio.smoothing.resonatorEnergy;
        this.excitationBuffer = 0;
        this.excitationFilter = new OnePoleFilter(0.7);

        this.setDelayFromNote(48 + id * 2);
    }

    process(couplingInput, dampingMod) {
        const forward = this.forwardDelay.read();
        const backward = this.backwardDelay.read();

        const dampingFactor = 1 - Math.min(this.baseDamping * dampingMod, 0.5);
        const smoothedExcitation = this.excitationFilter.process(this.excitationBuffer);
        const junction = backward + smoothedExcitation + couplingInput;

        const forwardWave = junction * dampingFactor;
        const backwardWave = -forward * dampingFactor * this.stiffness;

        this.forwardDelay.write(Math.tanh(forwardWave));
        this.backwardDelay.write(Math.tanh(backwardWave));

        this.excitationBuffer = 0;

        const output = forwardWave + backwardWave;
        this.energy =
            this.energy * (1 - this.energySmoothing) + Math.abs(output) * this.energySmoothing;

        return output;
    }

    excite(type, params) {
        this.excitationBuffer = ExcitationModel.create(type, params);
    }

    setMaterial(material) {
        this.stiffness = material.stiffness;
        this.baseDamping = material.damping;
    }

    setDelayFromPhysics(density, tension, length) {
        const delaySamples = calculateDelaySamples({
            density,
            tension,
            length,
            sampleRate: this.sampleRate,
            maxDelay: this.forwardDelay.maxDelay,
        });
        this.forwardDelay.setDelay(delaySamples);
        this.backwardDelay.setDelay(delaySamples);
    }

    setDelayFromNote(midiNote) {
        const frequency = frequencyFromNote(midiNote);
        const delaySamples = delayFromFrequency(
            frequency,
            this.sampleRate,
            this.forwardDelay.maxDelay,
        );
        this.forwardDelay.setDelay(delaySamples);
        this.backwardDelay.setDelay(delaySamples);
    }

    reset() {
        this.energy = 0;
        this.excitationBuffer = 0;
        this.excitationFilter.reset();
        this.forwardDelay.reset();
        this.backwardDelay.reset();
    }
}
