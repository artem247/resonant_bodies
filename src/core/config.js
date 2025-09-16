import {
    ANALYSER_FFT_SIZE,
    BASE_SAMPLE_RATE,
    DEFAULT_BUFFER_SIZE,
    DEFAULT_MASTER_GAIN,
    DEFAULT_MAX_DELAY_MS,
    DEFAULT_SMOOTHING,
    MAX_RESONATORS,
} from "./constants.js";

export const Config = {
    audio: {
        baseSampleRate: BASE_SAMPLE_RATE,
        maxResonators: MAX_RESONATORS,
        bufferSize: DEFAULT_BUFFER_SIZE,
        maxDelayMs: DEFAULT_MAX_DELAY_MS,
        masterGain: DEFAULT_MASTER_GAIN,
        smoothing: { ...DEFAULT_SMOOTHING },
        analyser: {
            fftSize: ANALYSER_FFT_SIZE,
        },
    },
    ui: {
        visualization: {
            fps: 30,
            colors: {
                primary: "#00d4aa",
                secondary: "#0099ff",
            },
        },
    },
    physics: {
        defaultMaterial: {
            stiffness: 0.98,
            damping: 0.01,
        },
        materials: {
            wood: { stiffness: 0.98, damping: 0.01 },
            metal: { stiffness: 0.995, damping: 0.005 },
            glass: { stiffness: 0.999, damping: 0.002 },
            membrane: { stiffness: 0.97, damping: 0.02 },
        },
    },
};
