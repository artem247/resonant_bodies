import { MSG } from "../core/message-types.js";
import { ResonantBodiesSynth } from "../dsp/synth-engine.js";

export class ScriptProcessorFallback {
    constructor(context, options = {}) {
        this.context = context;
        this.bufferSize = options.bufferSize ?? 2048;
        this.synth = new ResonantBodiesSynth(context.sampleRate);
        this.node = context.createScriptProcessor(this.bufferSize, 0, 2);
        this.energyHandler = null;

        this.node.onaudioprocess = (event) => {
            const output = event.outputBuffer;
            const bufferSize = output.length;
            const interleaved = new Float32Array(bufferSize * 2);
            this.synth.process(interleaved, bufferSize);

            const left = output.getChannelData(0);
            const right = output.getChannelData(1);
            for (let i = 0; i < bufferSize; i++) {
                left[i] = interleaved[i * 2];
                right[i] = interleaved[i * 2 + 1];
            }

            if (this.energyHandler && Math.random() < 0.1) {
                const energies = this.synth.resonators.map((r) => r.energy);
                this.energyHandler(energies);
            }
        };
    }

    onEnergy(handler) {
        this.energyHandler = handler;
    }

    processMessage(type, data) {
        switch (type) {
            case MSG.EXCITE:
                this.synth.exciteResonator(data.index, data.excitationType, data.params);
                break;
            case MSG.UPDATE_MATERIAL:
                this.synth.updateMaterialPosition(data.x, data.y, data.z);
                break;
            case MSG.SET_TOPOLOGY: {
                const newStrength = this.synth.setTopology(data.topology);
                return { type: MSG.COUPLING_UPDATE, data: newStrength };
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
        return null;
    }

    connect(destination) {
        this.node.connect(destination);
    }

    disconnect() {
        this.node.disconnect();
    }

    dispose() {
        this.disconnect();
        this.node.onaudioprocess = null;
        this.node = null;
    }
}
