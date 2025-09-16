export class TopologySelector extends EventTarget {
    constructor(buttons) {
        super();
        this.buttons = Array.from(buttons);
        this.handleClick = this.handleClick.bind(this);
        this.buttons.forEach((button) =>
            button.addEventListener("click", this.handleClick),
        );
    }

    handleClick(event) {
        const button = event.currentTarget;
        const topology = button.dataset.topology;
        this.setActive(topology);
        this.dispatchEvent(new CustomEvent("change", { detail: topology }));
    }

    setActive(topology) {
        this.buttons.forEach((button) => {
            const isActive = button.dataset.topology === topology;
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    setDisabled(disabled) {
        this.buttons.forEach((button) => {
            button.disabled = disabled;
        });
    }

    destroy() {
        this.buttons.forEach((button) =>
            button.removeEventListener("click", this.handleClick),
        );
    }
}
