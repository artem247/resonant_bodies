export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax - inMin === 0) {
        return outMin;
    }
    const ratio = (value - inMin) / (inMax - inMin);
    return lerp(outMin, outMax, ratio);
}
