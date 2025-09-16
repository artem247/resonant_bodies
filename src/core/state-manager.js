import { Config } from "./config.js";

export class StateManager extends EventTarget {
    constructor(initialState) {
        super();
        this.state = initialState ?? this.getInitialState();
    }

    getInitialState() {
        return {
            audio: {
                isRunning: false,
                volume: Config.audio.masterGain,
            },
            synth: {
                topology: "ring",
                coupling: 0.3,
            },
            ui: {
                selectedResonator: null,
            },
        };
    }

    getByPath(path) {
        return path.split(".").reduce((acc, key) => {
            if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
                return acc[key];
            }
            return undefined;
        }, this.state);
    }

    setByPath(path, value) {
        const segments = path.split(".");
        let target = this.state;

        for (let i = 0; i < segments.length - 1; i++) {
            const key = segments[i];
            if (!target[key] || typeof target[key] !== "object") {
                target[key] = {};
            }
            target = target[key];
        }

        target[segments[segments.length - 1]] = value;
    }

    update(path, value) {
        const oldValue = this.getByPath(path);
        if (oldValue === value) {
            return;
        }

        this.setByPath(path, value);
        this.dispatchEvent(
            new CustomEvent("state-change", {
                detail: { path, oldValue, newValue: value },
            }),
        );
    }

    getState() {
        if (typeof structuredClone === "function") {
            return structuredClone(this.state);
        }
        return JSON.parse(JSON.stringify(this.state));
    }
}
