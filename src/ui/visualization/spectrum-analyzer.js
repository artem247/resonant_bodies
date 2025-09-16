export class SpectrumAnalyzer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.analyser = null;
        this.lastDraw = 0;
        this.fps = options.fps ?? 30;
    }

    setAnalyser(analyser) {
        this.analyser = analyser;
    }

    draw(now) {
        if (!this.analyser) return;
        const interval = 1000 / this.fps;
        if (now - this.lastDraw < interval) {
            return;
        }
        this.lastDraw = now;

        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, "rgba(0, 212, 170, 0.8)");
            gradient.addColorStop(1, "rgba(0, 153, 255, 0.3)");

            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}
