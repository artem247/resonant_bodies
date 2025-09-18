# Resonant Bodies Architecture Overview

## High-Level System Summary
Resonant Bodies is a browser-based physical modelling synthesizer built on a layered architecture that separates UI, application state, audio infrastructure, and DSP logic. The `ResonantBodiesApp` class wires together a `StateManager`, `AudioContextManager`, and `UIController`, routing user input to the audio engine and feeding analytical data back to the interface.【F:src/app.js†L1-L129】 The application boots as an ES module from `index.html`, which provides the control surface and visualization canvases for users to interact with the synthesizer.

```
┌───────────────┐      user events       ┌──────────────┐       messages       ┌────────────────┐
│  UI (DOM +    │ ─────────────────────▶ │  App / State │ ───────────────────▶ │ Audio Bridge &  │
│  controllers) │                        │  Coordination │                      │  Context         │
└──────┬────────┘                        └──────────────┘                      └────────┬───────┘
       │   visual + status updates                                          audio &     │
       │                                                                       control  │
       ▼                                                                         events ▼
┌────────────────────┐                                                     ┌─────────────────────┐
│ Visualization Loop │ ◀──────── analysis & energy feedback ───────────── │ DSP (Worklet/Fallback│
│ (Canvas + Spectrum)│                                                     │ Synth Engine)        │
└────────────────────┘                                                     └─────────────────────┘
```

## Core Modules
### Application & State (`src/app.js`, `src/core/*`)
* **StateManager** centralizes mutable application state, providing dot-path getters/setters and change notifications. It seeds default audio/UI values from static configuration data.【F:src/core/state-manager.js†L3-L68】【F:src/core/config.js†L11-L44】
* **ResonantBodiesApp** registers UI-originated events (start/stop, excitations, parameter changes) and translates them into bridge messages for the audio layer. It also manages lifecycle transitions, ensuring that analyser nodes and energy displays are reset on stop.【F:src/app.js†L25-L119】
* **Configuration** constants describe synthesizer limits (e.g., max resonators, analyser FFT size) shared across DSP and UI subsystems.【F:src/core/constants.js†L1-L12】【F:src/core/config.js†L11-L44】

### Audio Infrastructure (`src/audio/*`, `workers/audio-worklet.js`)
* **AudioContextManager** creates the `AudioContext`, master gain, analyser, and either an `AudioWorkletNode` or a ScriptProcessor fallback. It listens for messages from the DSP layer and re-emits them as DOM events so the UI can update energy meters or coupling values.【F:src/audio/audio-context-manager.js†L6-L134】
* **SynthBridge** abstracts message passing to either the worklet port or fallback synth, emitting a `message` event for responses like energy snapshots or topology acknowledgements.【F:src/audio/synth-bridge.js†L1-L37】
* **ScriptProcessorFallback** instantiates the DSP engine directly in the main thread when audio worklets are unavailable, mirroring the message protocol expected by the bridge.【F:src/audio/script-processor-fallback.js†L4-L85】
* **Audio Worklet** loads `ResonantBodiesSynth` inside an audio rendering thread. It copies the synth output into channel buffers each render quantum, periodically emits energy statistics, and returns coupling strength updates when the topology changes.【F:workers/audio-worklet.js†L4-L104】

### DSP Engine (`src/dsp/*`, `src/physics/*`)
* **ResonantBodiesSynth** orchestrates a bank of resonators, a coupling network, and a spatial mixer. Each audio sample computes inter-resonator coupling, advances each resonator’s waveguide state, and derives stereo output samples. Material changes propagate stiffness/damping updates and retune delays according to basic wave physics helpers.【F:src/dsp/synth-engine.js†L8-L127】【F:src/physics/wave-physics.js†L1-L21】【F:src/physics/materials.js†L1-L14】
* **Resonator** models a bidirectional delay-line waveguide with damping, stiffness, excitation injection, and smoothed energy tracking for UI feedback.【F:src/dsp/resonator.js†L11-L96】
* **CouplingNetwork** defines graph topologies (ring, grid, tree, mesh), applies one-pole filtered coupling between resonators, and enforces rough energy conservation before returning per-resonator coupling inputs.【F:src/dsp/coupling-network.js†L4-L169】
* **SpatialProcessor** calculates stereo panning coefficients based on resonator index to spatialize the summed output.【F:src/dsp/spatial-processor.js†L1-L28】
* **Physics helpers** convert user gestures into physical parameters via excitation models and wave propagation equations.【F:src/physics/excitation-models.js†L1-L24】【F:src/physics/wave-physics.js†L1-L21】

### User Interface (`index.html`, `src/ui/*`, `styles/*`)
* **Static markup** defines panels for controls, topology selection, material exploration, excitation buttons, and visualization canvases consumed by the UI controller.【F:index.html†L14-L204】
* **UIController** binds DOM elements to control abstractions, emitting semantic events (e.g., `parameter-change`, `excite`) and disabling inputs while the engine is stopped. It also forwards analyser nodes and energy arrays into visualization helpers.【F:src/ui/ui-controller.js†L9-L240】
* **Control components** wrap raw DOM inputs to normalize values, maintain accessibility attributes, and expose event APIs used by the UI controller.【F:src/ui/controls/slider-control.js†L1-L36】【F:src/ui/controls/topology-selector.js†L1-L32】【F:src/ui/controls/material-space.js†L1-L39】
* **Visualization** modules resize canvases, draw animated resonator/coupling states, and render FFT spectra at a configurable frame rate.【F:src/ui/visualization/canvas-manager.js†L1-L20】【F:src/ui/visualization/resonator-network.js†L1-L439】【F:src/ui/visualization/spectrum-analyzer.js†L1-L40】

## Data & Control Flow
1. **Bootstrapping:** `bootstrap()` instantiates `ResonantBodiesApp` and initializes the UI once the DOM is ready, exposing the app on `window` for debugging.【F:src/app.js†L131-L144】
2. **User Interaction:** UI components emit semantic events (`start`, `parameter-change`, `material-change`, `excite`) that the app forwards to the audio bridge. Controls are disabled until the audio engine reports a successful start, preventing invalid operations.【F:src/app.js†L25-L107】【F:src/ui/ui-controller.js†L49-L227】
3. **Audio Processing:** The `AudioContextManager` sets up the worklet or fallback synth. The DSP engine processes each buffer by iterating resonators, applying coupling, and writing stereo output. The worklet periodically reports energy and analysis data back through the bridge.【F:src/audio/audio-context-manager.js†L18-L133】【F:src/dsp/synth-engine.js†L45-L68】【F:workers/audio-worklet.js†L49-L104】
4. **Feedback Loop:** Energy and coupling messages propagate to the UI where the network visualizer smooths and renders state changes. Analyser nodes stream FFT data into the spectrum display at ~30 FPS.【F:src/app.js†L14-L57】【F:src/ui/visualization/resonator-network.js†L30-L212】【F:src/ui/visualization/spectrum-analyzer.js†L1-L40】

## Areas for Improvement
* **Coupling buffer allocations:** `CouplingNetwork.calculateCoupling` creates a fresh `Float32Array` for every audio sample, introducing heavy garbage collection pressure. Persisting and reusing a scratch buffer would reduce per-sample allocations inside the real-time audio path.【F:src/dsp/coupling-network.js†L118-L155】
* **Unused LFO modulators:** `ResonantBodiesSynth` instantiates low-frequency oscillators but never applies them to parameters, suggesting either unfinished modulation features or dead code. Wiring these into resonator properties (or removing them) would clarify intent and avoid wasted computation.【F:src/dsp/synth-engine.js†L17-L28】
* **Shared math utilities:** `MaterialSpace` reimplements a local `clamp`, duplicating functionality already available in `core/math-utils`. Importing the shared helper would ensure consistent behaviour and shrink bundle size.【F:src/ui/controls/material-space.js†L1-L43】【F:src/core/math-utils.js†L1-L14】
* **Topology visual feedback:** The visualizer maintains fields for coupling matrices and flow history, but no module currently calls `setCouplingMatrix` with live data, leaving connections static. Surfacing real coupling data from `CouplingNetwork` via bridge messages would unlock the intended diagnostics.【F:src/ui/visualization/resonator-network.js†L15-L168】
* **State synchronization:** UI sliders update the app state when messages return (e.g., coupling), yet other parameters (damping, stiffness, tension) are not mirrored back from the synth. Adding response messages would keep UI state authoritative after external changes or future automation.【F:src/app.js†L73-L101】【F:src/ui/ui-controller.js†L229-L240】

## Suggested Next Steps
1. Introduce a typed-array scratch buffer inside `CouplingNetwork` and reuse it across `calculateCoupling` invocations to avoid allocations in the audio render loop.
2. Decide whether LFO modulation should affect damping/stiffness or be removed; if kept, emit modulation depth controls to the UI for transparency.
3. Export coupling graph data from the synth (perhaps during topology rebuild) so the network visualizer can highlight active edges and flows.
4. Establish a message schema for parameter acknowledgements so the UI can update state and visual indicators after script-triggered changes or preset loads.
5. Consolidate math helpers (e.g., `clamp`) into shared modules and reuse them to reduce duplication.
