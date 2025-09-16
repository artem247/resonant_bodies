import { MSG } from "../src/core/message-types.js";
import { ResonantBodiesSynth } from "../src/dsp/synth-engine.js";

class ResonantBodiesProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = new ResonantBodiesSynth(sampleRate);
        this.sampleCount = 0;
        this.samplesUntilReport = 4096;

        this.port.onmessage = (event) => {
            const { type, data } = event.data;
            switch (type) {
                case MSG.EXCITE:
                    this.synth.exciteResonator(data.index, data.excitationType, data.params);
                    break;
                case MSG.UPDATE_MATERIAL:
                    this.synth.updateMaterialPosition(data.x, data.y, data.z);
                    break;
                case MSG.SET_TOPOLOGY: {
                    const newStrength = this.synth.setTopology(data.topology);
                    this.port.postMessage({ type: MSG.COUPLING_UPDATE, data: newStrength });
                    break;
                }
                case MSG.SET_COUPLING:
                    this.synth.setCouplingStrength(data.value);
                    break;
                case MSG.SET_DAMPING:
                    this.synth.setGlobalDamping(data.value);
                    break;
                case MSG.SET_STIFFNESS:
                    this.synth.setGlobalStiffness(data.value);
                    break;
                case MSG.SET_TENSION:
                    this.synth.setTensionField(data.value);
                    break;
                case MSG.RESET:
                    this.synth.reset();
                    break;
                case MSG.CLOSE:
                    this.synth.close();
                    break;
                default:
                    break;
            }
        };
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || output.length === 0) {
            return true;
        }

        const bufferSize = output[0].length;
        const interleaved = new Float32Array(bufferSize * 2);
        this.synth.process(interleaved, bufferSize);

        for (let i = 0; i < bufferSize; i++) {
            output[0][i] = interleaved[i * 2];
            output[1][i] = interleaved[i * 2 + 1];
        }

        if (Math.random() < 0.1) {
            const energies = this.synth.resonators.map((resonator) => resonator.energy);
            this.port.postMessage({ type: MSG.ENERGY, data: energies });
        }

        this.reportAnalysis(output[0], bufferSize);
        return true;
    }

    reportAnalysis(channelData, bufferSize) {
        this.sampleCount += bufferSize;
        if (this.sampleCount < this.samplesUntilReport) {
            return;
        }
        this.sampleCount -= this.samplesUntilReport;

        let peakAmplitude = 0;
        for (let i = 0; i < bufferSize; i++) {
            const absSample = Math.abs(channelData[i]);
            if (absSample > peakAmplitude) {
                peakAmplitude = absSample;
            }
        }

        const resonatorData = this.synth.resonators.map((resonator) => ({
            id: resonator.id,
            energy: resonator.energy,
            frequency: sampleRate / resonator.forwardDelay.delaySamples,
        }));

        this.port.postMessage({
            type: "analysisData",
            data: {
                peakAmplitude,
                resonators: resonatorData,
            },
        });
    }
}

registerProcessor("resonant-bodies-processor", ResonantBodiesProcessor);
