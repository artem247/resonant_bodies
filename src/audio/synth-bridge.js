export class SynthBridge extends EventTarget {
    constructor() {
        super();
        this.workletNode = null;
        this.fallback = null;
    }

    connectToWorklet(node) {
        this.workletNode = node;
        if (node && node.port) {
            node.port.onmessage = (event) => {
                this.dispatchMessage(event.data);
            };
        }
    }

    connectToFallback(fallback) {
        this.fallback = fallback;
    }

    post(type, data) {
        const message = { type, data, timestamp: performance.now() };
        if (this.workletNode && this.workletNode.port) {
            this.workletNode.port.postMessage({ type, data });
        } else if (this.fallback) {
            const response = this.fallback.processMessage(type, data);
            if (response) {
                this.dispatchMessage(response);
            }
        }

        this.dispatchEvent(new CustomEvent("message-sent", { detail: message }));
    }

    dispatchMessage(detail) {
        this.dispatchEvent(new CustomEvent("message", { detail }));
    }
}
