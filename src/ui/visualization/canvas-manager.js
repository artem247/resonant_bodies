export class CanvasManager {
    constructor(canvases) {
        this.canvases = canvases;
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener("resize", this.handleResize);
        this.handleResize();
    }

    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        for (const { canvas, context } of this.canvases) {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    destroy() {
        window.removeEventListener("resize", this.handleResize);
    }
}
