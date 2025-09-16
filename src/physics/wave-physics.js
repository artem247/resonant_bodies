import { clamp } from "../core/math-utils.js";

export function frequencyFromNote(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function calculateDelaySamples({
    density,
    tension,
    length,
    sampleRate,
    maxDelay,
    multiplier = 8,
}) {
    const linearDensity = density * length;
    const waveSpeed = Math.sqrt(tension / Math.max(linearDensity, 1e-6));
    const frequency = (waveSpeed / (2 * Math.max(length, 1e-6))) * multiplier;
    const delaySamples = Math.floor(sampleRate / Math.max(frequency, 1e-6));
    return clamp(delaySamples, 2, maxDelay - 1);
}

export function delayFromFrequency(frequency, sampleRate, maxDelay) {
    const delaySamples = Math.floor(sampleRate / Math.max(frequency, 1e-6));
    return clamp(delaySamples, 2, maxDelay - 1);
}
