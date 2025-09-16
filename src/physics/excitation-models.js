export class ExcitationModel {
    static create(type, params = {}) {
        switch (type) {
            case "strike":
                return this.strike(params);
            case "bow":
                return this.bow(params);
            case "breath":
                return this.breath(params);
            default:
                return 0;
        }
    }

    static strike({ position = 0.5, hardness = 0.8 } = {}) {
        const fundamental = 1 - position;
        const harmonics = position * hardness;
        return (fundamental + harmonics * 0.5) * 0.4;
    }

    static bow({ position = 0.3, pressure = 0.7, velocity = 2 } = {}) {
        const stickSlip = Math.sin(velocity * 10) * pressure;
        return stickSlip * (1 - position * 0.5);
    }

    static breath({ pressure = 0.5, turbulence = 0.5 } = {}) {
        const noise = (Math.random() * 2 - 1) * turbulence;
        return pressure * 0.5 + noise;
    }
}
