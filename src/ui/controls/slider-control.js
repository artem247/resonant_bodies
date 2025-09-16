export class SliderControl extends EventTarget {
    constructor(input, display, options = {}) {
        super();
        this.input = input;
        this.display = display;
        this.normalize = options.normalize ?? ((value) => Number(value));
        this.denormalize = options.denormalize ?? ((value) => value);
        this.format = options.format ?? ((value) => value.toString());

        this.handleInput = this.handleInput.bind(this);
        this.input.addEventListener("input", this.handleInput);
        this.setValue(this.normalize(Number(this.input.value)));
    }

    handleInput(event) {
        const rawValue = Number(event.target.value);
        const value = this.normalize(rawValue);
        this.updateDisplay(value);
        this.input.setAttribute("aria-valuenow", String(event.target.value));
        this.dispatchEvent(new CustomEvent("change", { detail: value }));
    }

    updateDisplay(value) {
        if (this.display) {
            this.display.textContent = this.format(value);
        }
    }

    setValue(value) {
        this.input.value = String(this.denormalize(value));
        this.updateDisplay(value);
    }

    setDisabled(disabled) {
        this.input.disabled = disabled;
    }

    destroy() {
        this.input.removeEventListener("input", this.handleInput);
    }
}
