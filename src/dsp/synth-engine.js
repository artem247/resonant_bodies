import { Config } from "../core/config.js";
import { CouplingNetwork } from "./coupling-network.js";
import { Resonator } from "./resonator.js";
import { SpatialProcessor } from "./spatial-processor.js";
import { materialFromPosition } from "../physics/materials.js";

export class ResonantBodiesSynth {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.resonators = [];
        this.couplingNetwork = new CouplingNetwork();
        this.spatialProcessor = new SpatialProcessor(sampleRate);
        this.materialPosition = [0.5, 0.5, 0.5];
        this.tensionField = 0;

        const count = Config.audio.maxResonators;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const position = [Math.cos(angle) * 2, 0, Math.sin(angle) * 2];
            this.resonators.push(
                new Resonator(i, position, sampleRate, {
                    energySmoothing: Config.audio.smoothing.resonatorEnergy,
                }),
            );
        }

        this.resonatorOutputs = new Float32Array(count);
        this.previousOutputs = new Float32Array(count);
    }

    process(outputBuffer, bufferSize) {
        const dampingMod = 1 + this.tensionField * 0.01;

        for (let sample = 0; sample < bufferSize; sample++) {
            const couplingInputs = this.couplingNetwork.calculateCoupling(
                this.previousOutputs,
            );

            for (let i = 0; i < this.resonators.length; i++) {
                this.resonatorOutputs[i] = this.resonators[i].process(
                    couplingInputs[i],
                    dampingMod,
                );
            }

            this.previousOutputs.set(this.resonatorOutputs);

            const [left, right] = this.spatialProcessor.process(this.resonatorOutputs);
            outputBuffer[sample * 2] = Math.max(-1, Math.min(1, left * 0.5));
            outputBuffer[sample * 2 + 1] = Math.max(-1, Math.min(1, right * 0.5));
        }
    }

    exciteResonator(index, type, params) {
        if (index >= 0 && index < this.resonators.length) {
            this.resonators[index].excite(type, params);
        }
    }

    updateMaterialPosition(x, y, z) {
        this.materialPosition = [x, y, z];
        const material = materialFromPosition(x, y);

        for (let i = 0; i < this.resonators.length; i++) {
            const resonator = this.resonators[i];
            resonator.setMaterial(material);
            const tension = 50 + (1 - x) * 150;
            const length = 0.5 + i * 0.1;
            resonator.setDelayFromPhysics(x, tension, length);
        }

        this.couplingNetwork.couplingStrength = z;
    }

    setTopology(topology) {
        this.couplingNetwork.topology = topology;
        return this.couplingNetwork.rebuildTopology();
    }

    setCouplingStrength(value) {
        this.couplingNetwork.couplingStrength = value;
    }

    setGlobalDamping(value) {
        for (const resonator of this.resonators) {
            resonator.baseDamping = value;
        }
    }

    setGlobalStiffness(value) {
        for (const resonator of this.resonators) {
            resonator.stiffness = value;
        }
    }

    setTensionField(value) {
        this.tensionField = value;
    }

    reset() {
        for (const resonator of this.resonators) {
            resonator.reset();
        }
        this.couplingNetwork.reset();
        this.previousOutputs.fill(0);
        this.resonatorOutputs.fill(0);
    }

    close() {
        this.reset();
    }
}
