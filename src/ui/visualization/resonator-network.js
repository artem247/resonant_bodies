import { Config } from "../../core/config.js";

const defaults = {
    primaryColor: Config.ui.visualization.colors.primary,
    secondaryColor: Config.ui.visualization.colors.secondary,
};

export class ResonatorNetworkVisualizer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.options = { ...defaults, ...options };
        this.energies = new Float32Array(Config.audio.maxResonators);
    }

    setEnergies(energies) {
        if (energies) {
            this.energies = new Float32Array(energies);
        }
    }

    draw() {
        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;

        ctx.clearRect(0, 0, width, height);
        this.drawConnections(ctx, centerX, centerY, radius);
        this.drawNodes(ctx, centerX, centerY, radius);
    }

    drawConnections(ctx, centerX, centerY, radius) {
        ctx.strokeStyle = "rgba(0, 212, 170, 0.2)";
        ctx.lineWidth = 1;
        const count = Config.audio.maxResonators;

        for (let i = 0; i < count; i++) {
            const angle1 = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const next = (i + 1) % count;
            const angle2 = (next / count) * Math.PI * 2 - Math.PI / 2;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawNodes(ctx, centerX, centerY, radius) {
        const count = Config.audio.maxResonators;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const energy = this.energies[i] || 0;
            const size = 10 + energy * 30;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + energy * 0.2})`);
            gradient.addColorStop(
                0.5,
                `rgba(0, 212, 170, ${0.5 + energy * 0.5})`,
            );
            gradient.addColorStop(1, "rgba(0, 153, 255, 0)");

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
