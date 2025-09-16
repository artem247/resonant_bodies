import { Config } from "../core/config.js";
import { SliderControl } from "./controls/slider-control.js";
import { TopologySelector } from "./controls/topology-selector.js";
import { MaterialSpace } from "./controls/material-space.js";
import { CanvasManager } from "./visualization/canvas-manager.js";
import { ResonatorNetworkVisualizer } from "./visualization/resonator-network.js";
import { SpectrumAnalyzer } from "./visualization/spectrum-analyzer.js";

export class UIController extends EventTarget {
    constructor(root, stateManager) {
        super();
        this.root = root;
        this.stateManager = stateManager;
        this.isRunning = false;
        this.animationFrame = null;
    }

    initialize() {
        this.cacheElements();
        this.setupControls();
        this.setupVisualization();
        this.bindEvents();
        this.startAnimation();
    }

    cacheElements() {
        this.startBtn = this.root.getElementById("startBtn");
        this.stopBtn = this.root.getElementById("stopBtn");
        this.randomBtn = this.root.getElementById("randomExcite");
        this.bowBtn = this.root.getElementById("bowAll");
        this.excitationButtons = Array.from(
            this.root.querySelectorAll(".excitation-btn"),
        );
        this.couplingInput = this.root.getElementById("coupling");
        this.couplingDisplay = this.root.getElementById("couplingValue");
        this.dampingInput = this.root.getElementById("damping");
        this.dampingDisplay = this.root.getElementById("dampingValue");
        this.stiffnessInput = this.root.getElementById("stiffness");
        this.stiffnessDisplay = this.root.getElementById("stiffnessValue");
        this.tensionInput = this.root.getElementById("tension");
        this.tensionDisplay = this.root.getElementById("tensionValue");
        this.materialSpaceElement = this.root.getElementById("materialSpace");
        this.materialIndicator = this.root.getElementById("materialIndicator");
        this.topologyButtons = this.root.querySelectorAll(".topology-btn");
        this.resonatorCanvas = this.root.getElementById("resonatorCanvas");
        this.spectrumCanvas = this.root.getElementById("spectrumCanvas");
    }

    setupControls() {
        this.couplingSlider = new SliderControl(this.couplingInput, this.couplingDisplay, {
            normalize: (value) => value / 100,
            denormalize: (value) => Math.round(value * 100),
            format: (value) => value.toFixed(2),
        });
        this.couplingSlider.addEventListener("change", (event) => {
            this.dispatchEvent(
                new CustomEvent("parameter-change", {
                    detail: { parameter: "coupling", value: event.detail },
                }),
            );
        });

        this.dampingSlider = new SliderControl(this.dampingInput, this.dampingDisplay, {
            normalize: (value) => value / 1000,
            denormalize: (value) => Math.round(value * 1000),
            format: (value) => value.toFixed(3),
        });
        this.dampingSlider.addEventListener("change", (event) => {
            this.dispatchEvent(
                new CustomEvent("parameter-change", {
                    detail: { parameter: "damping", value: event.detail },
                }),
            );
        });

        this.stiffnessSlider = new SliderControl(this.stiffnessInput, this.stiffnessDisplay, {
            normalize: (value) => value / 100,
            denormalize: (value) => Math.round(value * 100),
            format: (value) => value.toFixed(2),
        });
        this.stiffnessSlider.addEventListener("change", (event) => {
            this.dispatchEvent(
                new CustomEvent("parameter-change", {
                    detail: { parameter: "stiffness", value: event.detail },
                }),
            );
        });

        this.tensionSlider = new SliderControl(this.tensionInput, this.tensionDisplay, {
            normalize: (value) => value / 100,
            denormalize: (value) => Math.round(value * 100),
            format: (value) => value.toFixed(2),
        });
        this.tensionSlider.addEventListener("change", (event) => {
            this.dispatchEvent(
                new CustomEvent("parameter-change", {
                    detail: { parameter: "tension", value: event.detail },
                }),
            );
        });

        this.materialSpace = new MaterialSpace(
            this.materialSpaceElement,
            this.materialIndicator,
        );
        this.materialSpace.addEventListener("change", (event) => {
            const { x, y } = event.detail;
            this.dispatchEvent(
                new CustomEvent("material-change", { detail: { x, y, z: 0.5 } }),
            );
        });

        this.topologySelector = new TopologySelector(this.topologyButtons);
        this.topologySelector.addEventListener("change", (event) => {
            this.dispatchEvent(
                new CustomEvent("topology-change", { detail: event.detail }),
            );
        });

        this.setRunning(false);
    }

    setupVisualization() {
        this.resonatorCtx = this.resonatorCanvas.getContext("2d");
        this.spectrumCtx = this.spectrumCanvas.getContext("2d");
        this.canvasManager = new CanvasManager([
            { canvas: this.resonatorCanvas, context: this.resonatorCtx },
            { canvas: this.spectrumCanvas, context: this.spectrumCtx },
        ]);
        this.networkVisualizer = new ResonatorNetworkVisualizer(this.resonatorCanvas);
        this.spectrumAnalyzer = new SpectrumAnalyzer(this.spectrumCanvas, {
            fps: Config.ui.visualization.fps,
        });
    }

    bindEvents() {
        this.startBtn.addEventListener("click", () => {
            this.dispatchEvent(new Event("start"));
        });

        this.stopBtn.addEventListener("click", () => {
            this.dispatchEvent(new Event("stop"));
        });

        this.randomBtn.addEventListener("click", () => {
            const index = Math.floor(Math.random() * Config.audio.maxResonators);
            this.emitExcite({
                index,
                excitationType: "strike",
                params: {
                    position: Math.random(),
                    hardness: 0.5 + Math.random() * 0.5,
                },
            });
        });

        this.bowBtn.addEventListener("click", () => {
            this.dispatchEvent(new Event("bow-all"));
        });

        this.excitationButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.resonator);
                this.emitExcite({
                    index,
                    excitationType: "strike",
                    params: { position: 0.5, hardness: 0.8 },
                });
            });
        });

        this.handleKeydown = this.handleKeydown.bind(this);
        document.addEventListener("keydown", this.handleKeydown);
    }

    startAnimation() {
        const loop = (now) => {
            this.networkVisualizer.draw();
            this.spectrumAnalyzer.draw(now);
            this.animationFrame = requestAnimationFrame(loop);
        };
        this.animationFrame = requestAnimationFrame(loop);
    }

    handleKeydown(event) {
        if (!this.isRunning) {
            return;
        }
        if (event.key >= "1" && event.key <= "8") {
            const index = Number(event.key) - 1;
            if (index < Config.audio.maxResonators) {
                this.emitExcite({
                    index,
                    excitationType: "strike",
                    params: { position: 0.5, hardness: 0.8 },
                });
            }
        } else if (event.key === " ") {
            event.preventDefault();
            this.randomBtn.click();
        }
    }

    emitExcite(detail) {
        if (!this.isRunning) {
            return;
        }
        this.dispatchEvent(new CustomEvent("excite", { detail }));
    }

    setRunning(running) {
        this.isRunning = running;
        this.startBtn.disabled = running;
        this.stopBtn.disabled = !running;
        this.randomBtn.disabled = !running;
        this.bowBtn.disabled = !running;
        this.excitationButtons.forEach((button) => {
            button.disabled = !running;
        });
        this.couplingSlider.setDisabled(!running);
        this.dampingSlider.setDisabled(!running);
        this.stiffnessSlider.setDisabled(!running);
        this.tensionSlider.setDisabled(!running);
        this.materialSpace.setDisabled(!running);
        this.topologySelector.setDisabled(!running);
        this.stateManager.update("audio.isRunning", running);
    }

    updateEnergies(energies) {
        this.networkVisualizer.setEnergies(energies);
    }

    updateCoupling(value) {
        this.couplingSlider.setValue(value);
        this.stateManager.update("synth.coupling", value);
    }

    setAnalyser(analyser) {
        this.spectrumAnalyzer.setAnalyser(analyser);
    }
}
