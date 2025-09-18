import { Config } from "../../core/config.js";

const defaults = {
  primaryColor: Config.ui.visualization.colors.primary,
  secondaryColor: Config.ui.visualization.colors.secondary,
  dampingColor: "#FF6B35",
  tensionColor: "#00FFE0",
  smoothing: 0.85, // How much to smooth parameter changes
};

export class ResonatorNetworkVisualizer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = { ...defaults, ...options };

    const count = Config.audio.maxResonators;

    // Actual synth state
    this.energies = new Float32Array(count);
    this.dampingValues = new Float32Array(count);
    this.stiffnessValues = new Float32Array(count);
    this.delayTimes = new Float32Array(count);
    this.couplingMatrix = []; // Actual coupling strengths
    this.couplingFlows = new Map(); // Track actual energy transfer

    // Smoothed values for visual stability
    this.smoothedEnergies = new Float32Array(count);
    this.smoothedDamping = new Float32Array(count);
    this.smoothedStiffness = new Float32Array(count);
    this.smoothedDelays = new Float32Array(count);

    // Position based on physical parameters
    this.nodePositions = new Array(count);
    this.topology = "ring";

    // History for showing actual energy flow over time
    this.energyDeltas = new Array(count).fill(0);
    this.flowHistory = new Map(); // Connection -> array of flow values

    this.initializePositions();
  }

  initializePositions() {
    const count = Config.audio.maxResonators;
    for (let i = 0; i < count; i++) {
      this.nodePositions[i] = { x: 0, y: 0 };
    }
  }

  // Update methods - only called when actual parameters change
  setEnergies(energies) {
    if (energies) {
      // Calculate actual energy changes
      for (let i = 0; i < energies.length; i++) {
        this.energyDeltas[i] = energies[i] - this.energies[i];
        this.energies[i] = energies[i];

        // Smooth for visual stability
        const s = this.options.smoothing;
        this.smoothedEnergies[i] =
          this.smoothedEnergies[i] * s + energies[i] * (1 - s);
      }
    }
  }

  setDampingValues(damping) {
    if (damping) {
      for (let i = 0; i < damping.length; i++) {
        this.dampingValues[i] = damping[i];
        const s = this.options.smoothing;
        this.smoothedDamping[i] =
          this.smoothedDamping[i] * s + damping[i] * (1 - s);
      }
    }
  }

  setStiffnessValues(stiffness) {
    if (stiffness) {
      for (let i = 0; i < stiffness.length; i++) {
        this.stiffnessValues[i] = stiffness[i];
        const s = this.options.smoothing;
        this.smoothedStiffness[i] =
          this.smoothedStiffness[i] * s + stiffness[i] * (1 - s);
      }
    }
  }

  setDelayTimes(delays) {
    if (delays) {
      for (let i = 0; i < delays.length; i++) {
        this.delayTimes[i] = delays[i];
        const s = this.options.smoothing;
        this.smoothedDelays[i] =
          this.smoothedDelays[i] * s + delays[i] * (1 - s);
      }
    }
  }

  setCouplingMatrix(matrix) {
    this.couplingMatrix = matrix;
  }

  setCouplingFlows(flows) {
    // flows is a map of {from, to} -> energy amount
    this.couplingFlows = flows;

    // Update flow history
    flows.forEach((amount, key) => {
      if (!this.flowHistory.has(key)) {
        this.flowHistory.set(key, []);
      }
      const history = this.flowHistory.get(key);
      history.push(amount);
      if (history.length > 20) history.shift(); // Keep last 20 samples
    });
  }

  setTopology(topology, connections) {
    this.topology = topology;
    this.couplingMatrix = connections;
  }

  draw() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear with dark background
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillRect(0, 0, width, height);

    // Update positions based on actual physical parameters
    this.updateNodePositions();

    // Draw actual coupling energy flows
    this.drawCouplingFlows(ctx, width, height);

    // Draw connections with actual coupling strength
    this.drawConnections(ctx, width, height);

    // Draw nodes with actual parameter visualization
    this.drawNodes(ctx, width, height);

    // Draw parameter indicators
    this.drawParameterIndicators(ctx, width, height);
  }

  updateNodePositions() {
    const count = Config.audio.maxResonators;
    const positions = this.nodePositions;

    for (let i = 0; i < count; i++) {
      // Base position from topology
      let baseAngle = (i / count) * Math.PI * 2 - Math.PI / 2;
      let baseRadius = 1;

      // Modify radius based on delay time (frequency/pitch)
      // Longer delays = lower frequency = closer to center
      const normalizedDelay = this.smoothedDelays[i] / 1000; // Normalize to reasonable range
      baseRadius = 0.5 + (1 - normalizedDelay) * 0.5;

      // Modify angle slightly based on stiffness (spectral brightness)
      // Higher stiffness = brighter = slight clockwise shift
      const stiffnessOffset = (this.smoothedStiffness[i] - 0.5) * 0.2;
      baseAngle += stiffnessOffset;

      // Calculate position
      positions[i].x = Math.cos(baseAngle) * baseRadius;
      positions[i].y = Math.sin(baseAngle) * baseRadius;

      // Apply damping as a "pull" toward center (high damping = more centered)
      const dampingPull = this.smoothedDamping[i];
      positions[i].x *= 1 - dampingPull * 0.3;
      positions[i].y *= 1 - dampingPull * 0.3;
    }
  }

  drawCouplingFlows(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.35;

    // Draw actual energy flowing through connections
    this.couplingFlows.forEach((flowAmount, connectionKey) => {
      const [fromIdx, toIdx] = connectionKey.split("-").map(Number);
      if (isNaN(fromIdx) || isNaN(toIdx)) return;

      const fromPos = this.nodePositions[fromIdx];
      const toPos = this.nodePositions[toIdx];

      if (!fromPos || !toPos) return;

      const x1 = centerX + fromPos.x * scale;
      const y1 = centerY + fromPos.y * scale;
      const x2 = centerX + toPos.x * scale;
      const y2 = centerY + toPos.y * scale;

      // Only draw if there's actual flow
      if (Math.abs(flowAmount) > 0.001) {
        // Flow direction indicator
        const flowIntensity = Math.min(Math.abs(flowAmount), 1);
        const flowDirection = flowAmount > 0 ? 1 : -1;

        // Draw flow as moving dots along the connection
        const history = this.flowHistory.get(connectionKey) || [];
        if (history.length > 0) {
          ctx.save();

          // Draw flow trail
          for (let i = 0; i < history.length; i++) {
            const t = i / history.length;
            const flow = history[i];

            if (Math.abs(flow) > 0.001) {
              // Position along the line based on flow direction
              const progress = flowDirection > 0 ? t : 1 - t;
              const px = x1 + (x2 - x1) * progress;
              const py = y1 + (y2 - y1) * progress;

              const alpha = (1 - t) * Math.abs(flow);
              ctx.fillStyle = `rgba(0, 255, 224, ${alpha})`;
              ctx.beginPath();
              ctx.arc(px, py, 2 + Math.abs(flow) * 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
        }
      }
    });
  }

  drawConnections(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.35;

    ctx.save();

    // Draw connections based on actual coupling matrix
    this.couplingMatrix.forEach((connection) => {
      if (!connection) return;

      const { from, to, strength } = connection;
      const fromPos = this.nodePositions[from];
      const toPos = this.nodePositions[to];

      if (!fromPos || !toPos) return;

      const x1 = centerX + fromPos.x * scale;
      const y1 = centerY + fromPos.y * scale;
      const x2 = centerX + toPos.x * scale;
      const y2 = centerY + toPos.y * scale;

      // Line opacity and width based on actual coupling strength
      ctx.strokeStyle = `rgba(0, 212, 170, ${strength * 0.3})`;
      ctx.lineWidth = 1 + strength * 2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawNodes(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.35;
    const count = Config.audio.maxResonators;

    for (let i = 0; i < count; i++) {
      const pos = this.nodePositions[i];
      const x = centerX + pos.x * scale;
      const y = centerY + pos.y * scale;

      // Node size based on actual energy
      const energy = this.smoothedEnergies[i];
      const baseSize = 8;
      const size = baseSize + energy * 30;

      // Color based on multiple parameters
      const damping = this.smoothedDamping[i];
      const stiffness = this.smoothedStiffness[i];

      // Multi-layer rendering for depth
      // Outer glow - energy field
      if (energy > 0.01) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        glowGradient.addColorStop(0, `rgba(0, 255, 224, ${energy * 0.3})`);
        glowGradient.addColorStop(1, "rgba(0, 255, 224, 0)");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Middle layer - parameter visualization
      const paramGradient = ctx.createRadialGradient(
        x,
        y,
        size * 0.2,
        x,
        y,
        size,
      );

      // Color represents physical state
      // Red channel: damping (more red = more damped)
      // Green channel: energy
      // Blue channel: stiffness (more blue = stiffer)
      const r = Math.floor(damping * 255);
      const g = Math.floor(energy * 255);
      const b = Math.floor(stiffness * 255);

      paramGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
      paramGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
      paramGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = paramGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Core - bright center if active
      if (energy > 0.1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${energy})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Energy delta indicator (show recent changes)
      if (Math.abs(this.energyDeltas[i]) > 0.01) {
        ctx.save();
        ctx.strokeStyle =
          this.energyDeltas[i] > 0
            ? `rgba(0, 255, 0, ${Math.abs(this.energyDeltas[i])})`
            : `rgba(255, 0, 0, ${Math.abs(this.energyDeltas[i])})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Decay the delta for next frame
        this.energyDeltas[i] *= 0.9;
      }
    }
  }

  drawParameterIndicators(ctx, width, height) {
    // Draw legend showing what visual elements mean
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";

    const legendItems = [
      "Size: Energy",
      "Distance from center: Frequency (delay)",
      "Red: Damping",
      "Blue: Stiffness",
      "Green: Energy",
      "Flow dots: Coupling transfer",
    ];

    legendItems.forEach((item, i) => {
      ctx.fillText(item, 10, 20 + i * 12);
    });

    ctx.restore();

    // Draw global parameter bars if needed
    this.drawGlobalParameters(ctx, width, height);
  }

  drawGlobalParameters(ctx, width, height) {
    // Calculate and show average parameters
    const count = Config.audio.maxResonators;
    let avgEnergy = 0,
      avgDamping = 0,
      avgStiffness = 0;

    for (let i = 0; i < count; i++) {
      avgEnergy += this.smoothedEnergies[i] / count;
      avgDamping += this.smoothedDamping[i] / count;
      avgStiffness += this.smoothedStiffness[i] / count;
    }

    // Draw parameter bars at bottom
    const barWidth = width / 3 - 20;
    const barHeight = 4;
    const barY = height - 20;

    // Energy bar
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.fillRect(10, barY, barWidth, barHeight);
    ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
    ctx.fillRect(10, barY, barWidth * avgEnergy, barHeight);

    // Damping bar
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(10 + barWidth + 10, barY, barWidth, barHeight);
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(10 + barWidth + 10, barY, barWidth * avgDamping, barHeight);

    // Stiffness bar
    ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
    ctx.fillRect(10 + (barWidth + 10) * 2, barY, barWidth, barHeight);
    ctx.fillStyle = "rgba(0, 0, 255, 0.8)";
    ctx.fillRect(
      10 + (barWidth + 10) * 2,
      barY,
      barWidth * avgStiffness,
      barHeight,
    );
  }

  reset() {
    this.energies.fill(0);
    this.smoothedEnergies.fill(0);
    this.dampingValues.fill(0);
    this.smoothedDamping.fill(0);
    this.stiffnessValues.fill(0);
    this.smoothedStiffness.fill(0);
    this.delayTimes.fill(0);
    this.smoothedDelays.fill(0);
    this.energyDeltas.fill(0);
    this.couplingFlows.clear();
    this.flowHistory.clear();
  }
}
