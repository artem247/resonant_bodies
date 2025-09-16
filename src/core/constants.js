export const BASE_SAMPLE_RATE = 48_000;
export const MAX_RESONATORS = 8;
export const DEFAULT_MAX_DELAY_MS = 100; // 100ms maximum delay for waveguides
export const DEFAULT_BUFFER_SIZE = 2048;
export const DEFAULT_MASTER_GAIN = 0.4;
export const ANALYSER_FFT_SIZE = 1024;

export const DEFAULT_SMOOTHING = Object.freeze({
    resonatorEnergy: 0.001,
    couplingEnergy: 0.05,
    damping: 0.95,
});
