import { AudioContextManager } from "./audio/audio-context-manager.js";
import { StateManager } from "./core/state-manager.js";
import { MSG } from "./core/message-types.js";
import { Config } from "./core/config.js";
import { UIController } from "./ui/ui-controller.js";

export class ResonantBodiesApp {
    constructor(root = document) {
        this.state = new StateManager();
        this.audio = new AudioContextManager();
        this.ui = new UIController(root, this.state);
        this.bridge = null;

        this.handleEnergy = (event) => this.ui.updateEnergies(event.detail);
        this.handleCoupling = (event) => this.ui.updateCoupling(event.detail);
        this.handleAnalysis = (event) => this.logAnalysis(event.detail);
    }

    initialize() {
        this.ui.initialize();
        this.registerUiEvents();
        this.registerAudioEvents();
    }

    registerUiEvents() {
        this.ui.addEventListener("start", () => this.handleStart());
        this.ui.addEventListener("stop", () => this.handleStop());
        this.ui.addEventListener("excite", (event) => this.handleExcite(event.detail));
        this.ui.addEventListener("parameter-change", (event) =>
            this.handleParameterChange(event.detail),
        );
        this.ui.addEventListener("topology-change", (event) =>
            this.handleTopologyChange(event.detail),
        );
        this.ui.addEventListener("material-change", (event) =>
            this.handleMaterialChange(event.detail),
        );
        this.ui.addEventListener("bow-all", () => this.handleBowAll());
    }

    registerAudioEvents() {
        this.audio.addEventListener("energy", this.handleEnergy);
        this.audio.addEventListener("coupling", this.handleCoupling);
        this.audio.addEventListener("analysis", this.handleAnalysis);
    }

    async handleStart() {
        const status = await this.audio.initialize();
        await this.audio.resume();

        this.bridge = status.bridge;
        if (!this.bridge) {
            console.warn("Synth bridge not available");
            return;
        }

        this.ui.setAnalyser(status.analyser);
        this.ui.setRunning(true);
    }

    async handleStop() {
        await this.audio.stop();
        this.bridge = null;
        this.ui.setRunning(false);
        this.ui.updateEnergies(new Float32Array(Config.audio.maxResonators));
    }

    handleExcite(detail) {
        if (!this.bridge) return;
        this.bridge.post(MSG.EXCITE, detail);
    }

    handleParameterChange({ parameter, value }) {
        if (!this.bridge) return;
        switch (parameter) {
            case "coupling":
                this.bridge.post(MSG.SET_COUPLING, { value });
                break;
            case "damping":
                this.bridge.post(MSG.SET_DAMPING, { value });
                break;
            case "stiffness":
                this.bridge.post(MSG.SET_STIFFNESS, { value });
                break;
            case "tension":
                this.bridge.post(MSG.SET_TENSION, { value });
                break;
            default:
                break;
        }
    }

    handleTopologyChange(topology) {
        if (!this.bridge) return;
        this.state.update("synth.topology", topology);
        this.bridge.post(MSG.SET_TOPOLOGY, { topology });
    }

    handleMaterialChange({ x, y, z }) {
        if (!this.bridge) return;
        this.bridge.post(MSG.UPDATE_MATERIAL, { x, y, z });
    }

    handleBowAll() {
        if (!this.bridge) return;
        for (let i = 0; i < Config.audio.maxResonators; i++) {
            setTimeout(() => {
                this.bridge.post(MSG.EXCITE, {
                    index: i,
                    excitationType: "bow",
                    params: {
                        position: 0.3,
                        pressure: 0.7,
                        velocity: 2 + Math.random() * 2,
                    },
                });
            }, i * 50);
        }
    }

    logAnalysis(detail) {
        if (!detail || detail.type !== "analysisData") {
            return;
        }
        const { peakAmplitude, resonators } = detail.data;
        console.log(`Peak Amplitude: ${peakAmplitude.toFixed(4)}`);
        console.table(resonators);
    }
}

function bootstrap() {
    const app = new ResonantBodiesApp(document);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            app.initialize();
            window.resonantBodies = app;
        });
    } else {
        app.initialize();
        window.resonantBodies = app;
    }
}

bootstrap();
