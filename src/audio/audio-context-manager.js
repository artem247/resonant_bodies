import { Config } from "../core/config.js";
import { MSG } from "../core/message-types.js";
import { ScriptProcessorFallback } from "./script-processor-fallback.js";
import { SynthBridge } from "./synth-bridge.js";

export class AudioContextManager extends EventTarget {
    constructor() {
        super();
        this.context = null;
        this.masterGain = null;
        this.analyser = null;
        this.processorNode = null;
        this.bridge = null;
        this.fallback = null;
        this.messageHandler = (event) => this.handleBridgeMessage(event.detail);
    }

    async initialize() {
        if (this.context) {
            return this.getStatus();
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = Config.audio.masterGain;

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = Config.audio.analyser.fftSize;

        this.bridge = new SynthBridge();
        this.bridge.addEventListener("message", this.messageHandler);

        try {
            const workletUrl = new URL("../../workers/audio-worklet.js", import.meta.url);
            await this.context.audioWorklet.addModule(workletUrl);
            this.processorNode = new AudioWorkletNode(
                this.context,
                "resonant-bodies-processor",
                {
                    outputChannelCount: [2],
                    numberOfInputs: 0,
                    numberOfOutputs: 1,
                },
            );
            this.processorNode.connect(this.masterGain);
            this.bridge.connectToWorklet(this.processorNode);
        } catch (error) {
            console.warn(
                "AudioWorklet not supported, falling back to ScriptProcessor",
                error,
            );
            this.fallback = new ScriptProcessorFallback(this.context, {
                bufferSize: Config.audio.bufferSize,
            });
            this.processorNode = this.fallback.node;
            this.processorNode.connect(this.masterGain);
            this.fallback.onEnergy((energies) => {
                this.dispatchEvent(new CustomEvent("energy", { detail: energies }));
            });
            this.bridge.connectToFallback(this.fallback);
        }

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.context.destination);

        return this.getStatus();
    }

    async resume() {
        if (this.context && this.context.state === "suspended") {
            await this.context.resume();
        }
    }

    async stop() {
        if (!this.context) {
            return;
        }

        if (this.bridge) {
            this.bridge.post(MSG.RESET, {});
            this.bridge.post(MSG.CLOSE, {});
            this.bridge.removeEventListener("message", this.messageHandler);
        }

        if (this.processorNode) {
            this.processorNode.disconnect();
        }
        if (this.masterGain) {
            this.masterGain.disconnect();
        }
        if (this.analyser) {
            this.analyser.disconnect();
        }
        if (this.fallback) {
            this.fallback.dispose();
            this.fallback = null;
        }

        await this.context.close();

        this.context = null;
        this.masterGain = null;
        this.analyser = null;
        this.processorNode = null;
        this.bridge = null;
    }

    getStatus() {
        return {
            context: this.context,
            analyser: this.analyser,
            bridge: this.bridge,
            masterGain: this.masterGain,
        };
    }

    handleBridgeMessage(message) {
        if (!message) return;
        const { type, data } = message;
        if (type === MSG.ENERGY) {
            this.dispatchEvent(new CustomEvent("energy", { detail: data }));
        } else if (type === MSG.COUPLING_UPDATE) {
            this.dispatchEvent(new CustomEvent("coupling", { detail: data }));
        } else {
            this.dispatchEvent(
                new CustomEvent("analysis", {
                    detail: { type, data },
                }),
            );
        }
    }
}
