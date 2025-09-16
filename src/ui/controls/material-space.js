export class MaterialSpace extends EventTarget {
    constructor(element, indicator) {
        super();
        this.element = element;
        this.indicator = indicator;
        this.disabled = false;
        this.handleClick = this.handleClick.bind(this);
        this.element.addEventListener("click", this.handleClick);
        this.updateIndicator(0.5, 0.5);
    }

    handleClick(event) {
        if (this.disabled) {
            return;
        }
        const rect = this.element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        this.updateIndicator(x, y);
        this.dispatchEvent(
            new CustomEvent("change", { detail: { x: clamp(x, 0, 1), y: clamp(y, 0, 1) } }),
        );
    }

    updateIndicator(x, y) {
        if (!this.indicator) return;
        this.indicator.style.left = `${x * 100}%`;
        this.indicator.style.top = `${y * 100}%`;
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        this.element.classList.toggle("is-disabled", disabled);
    }

    destroy() {
        this.element.removeEventListener("click", this.handleClick);
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
