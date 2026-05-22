---
title: "Hamiltonian"
titleAccent: "discovery from data"
number: "06"
blurb: "Hand the network raw (q, p, q̇, ṗ) trajectories from an unknown system. Symplectic backpropagation forces it to find the conserved scalar field that satisfies Hamilton's equations. PySR distills the resulting neural field into a closed-form analytic equation."
tags: ["HNN", "Symplectic", "PySR", "Symbolic Distillation"]
featured: false
streamlitSlug: "hamiltonian-discovery"
vizComponent: "ScopeViz"
order: 6
---

A Hamiltonian Neural Network (HNN) trained on observed dynamics from a system whose governing equations you don't know. The network parameterizes a scalar `H_θ(q, p)`; the loss is the residual against Hamilton's equations:

`L = ‖q̇ − ∂H_θ/∂p‖² + ‖ṗ + ∂H_θ/∂q‖²`

Once the network has converged, the scalar field it learned **is** the system's Hamiltonian — modulo constants. A symbolic-regression pass (PySR) on the field gradients extracts the closed-form expression, melting the weights away.

## What you can try

Three built-in systems with known truth so you can verify the recovery:

- **Simple harmonic oscillator** — `H = ½(p² + ω² q²)`. PySR should recover this exactly.
- **Double pendulum** — chaotic, two angles + two momenta. Hamiltonian has cross-coupling terms that classical sparse regression often misses.
- **Hénon-Heiles** — `H = ½(p_x² + p_y²) + ½(x² + y²) + x²y − y³/3`. A 2D nonlinear conservative system; recovery here is non-trivial.

For each, you get the training loss curve, the learned scalar field as a contour heatmap over phase space, the conserved-energy drift along held-out trajectories, and the PySR-distilled symbolic equation alongside the ground truth.

## Why this matters

The standard alternative is sparse identification of nonlinear dynamics (SINDy) — but SINDy needs the right basis library. HNN+PySR doesn't: the HNN finds a smooth latent that's manifestly conserved, then symbolic regression extracts the structure without prior guesses. The pipeline is one of the cleanest examples of neural-symbolic distillation working end-to-end.

## Backend

Modal container with `torch` + `pysr` (which carries a Julia runtime). Cold start ~90s the first time it boots (Julia package precompile); warm calls are seconds. All training is CPU-bound at this scale; recovery of SHO converges in seconds, double pendulum and Hénon-Heiles in tens of seconds.
