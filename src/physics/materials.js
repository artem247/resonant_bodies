import { clamp } from "../core/math-utils.js";

export const MATERIALS = Object.freeze({
    wood: { stiffness: 0.98, damping: 0.01 },
    metal: { stiffness: 0.995, damping: 0.005 },
    glass: { stiffness: 0.999, damping: 0.002 },
    membrane: { stiffness: 0.97, damping: 0.02 },
});

export function materialFromPosition(x, y) {
    const stiffness = 0.9 + clamp(x, 0, 1) * 0.099;
    const damping = clamp(y, 0, 1) * 0.1;
    return { stiffness, damping };
}
