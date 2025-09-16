import { clamp } from "../../core/math-utils.js";

export class OnePoleFilter {
    constructor(cutoff) {
        this.state = 0;
        this.coefficient = clamp(cutoff, 0, 0.99999);
    }

    process(input) {
        this.state = input * (1 - this.coefficient) + this.state * this.coefficient;
        return this.state;
    }

    setCutoff(cutoff) {
        this.coefficient = clamp(cutoff, 0, 0.99999);
    }

    reset() {
        this.state = 0;
    }
}
