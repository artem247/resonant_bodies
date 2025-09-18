import { Config } from "../core/config.js";
import { OnePoleFilter } from "./filters/one-pole.js";

export class CouplingNetwork {
  constructor() {
    const count = Config.audio.maxResonators;
    this.connections = Array.from({ length: count }, () => []);
    this.filters = Array.from({ length: count }, () => []);
    this.topology = "ring";
    this.couplingStrength = 0.3;
    this.rebuildTopology();
  }

  rebuildTopology() {
    const count = Config.audio.maxResonators;
    for (let i = 0; i < count; i++) {
      this.connections[i] = [];
      const filterRow = this.filters[i];
      if (filterRow) {
        for (let j = 0; j < count; j++) {
          if (filterRow[j]) {
            filterRow[j].reset();
          }
        }
      }
    }

    switch (this.topology) {
      case "ring":
        this.buildRing();
        break;
      case "grid":
        this.buildGrid(4, 2);
        break;
      case "tree":
        this.buildTree(3);
        break;
      case "mesh":
        this.buildMesh();
        break;
      default:
        this.buildRing();
        break;
    }

    return this.couplingStrength;
  }

  buildRing() {
    const count = Config.audio.maxResonators;
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      const prev = (i + count - 1) % count;
      this.addConnection(i, next, 0.5);
      this.addConnection(i, prev, 0.5);
    }
  }

  buildGrid(width, height) {
    const count = Config.audio.maxResonators;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (idx >= count) break;

        if (x > 0) this.addConnection(idx, idx - 1, 0.4);
        if (x < width - 1 && idx + 1 < count) {
          this.addConnection(idx, idx + 1, 0.4);
        }
        if (y > 0 && idx >= width) {
          this.addConnection(idx, idx - width, 0.4);
        }
        if (y < height - 1 && idx + width < count) {
          this.addConnection(idx, idx + width, 0.4);
        }
      }
    }
  }

  buildTree(branches) {
    const count = Config.audio.maxResonators;
    for (let i = 1; i <= branches && i < count; i++) {
      this.addConnection(0, i, 0.6);
    }

    let current = branches + 1;
    for (let parent = 1; parent <= branches; parent++) {
      for (let j = 0; j < 2; j++) {
        if (current >= count) break;
        this.addConnection(parent, current, 0.4);
        current++;
      }
    }
  }

  buildMesh() {
    const count = Config.audio.maxResonators;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const distance = 1 / (Math.abs(i - j) + 1);
        this.addConnection(i, j, distance * 0.2);
      }
    }
  }

  addConnection(from, to, strength) {
    const count = Config.audio.maxResonators;
    if (from < count && to < count) {
      this.connections[from].push({ to, strength });
      if (!this.filters[from]) this.filters[from] = [];
      if (!this.filters[from][to]) {
        this.filters[from][to] = new OnePoleFilter(0.8);
      }
    }
  }

  calculateCoupling(resonatorOutputs) {
    const count = Config.audio.maxResonators;
    const coupling = new Float32Array(count);

    // Calculate total energy being redistributed
    let totalCouplingEnergy = 0;

    for (let from = 0; from < count; from++) {
      for (const conn of this.connections[from]) {
        const filter = this.filters[from]?.[conn.to];
        if (!filter) continue;

        const filtered = filter.process(resonatorOutputs[from]);
        const signal = filtered * conn.strength * this.couplingStrength;

        coupling[conn.to] += signal;
        totalCouplingEnergy += Math.abs(signal);
      }
    }

    // Energy conservation: scale down if we're adding energy
    if (totalCouplingEnergy > 0) {
      const inputEnergy = resonatorOutputs.reduce(
        (sum, x) => sum + Math.abs(x),
        0,
      );
      const scaleFactor = Math.min(
        1,
        inputEnergy / (totalCouplingEnergy + 0.001),
      );

      for (let i = 0; i < count; i++) {
        coupling[i] *= scaleFactor * 0.95; // 0.95 ensures gradual decay
      }
    }

    return coupling;
  }

  reset() {
    const count = Config.audio.maxResonators;
    for (let i = 0; i < count; i++) {
      const row = this.filters[i];
      if (!row) continue;
      for (let j = 0; j < count; j++) {
        if (row[j]) {
          row[j].reset();
        }
      }
    }
  }
}
