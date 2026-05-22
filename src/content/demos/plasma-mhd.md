---
title: "Plasma MHD"
titleAccent: "Clifford bivector field"
number: "02"
blurb: "Tokamak plasma simulated as a unified Cl(3,0) multivector — magnetic field carried as a bivector means ∇·B = 0 is preserved structurally, not penalized. The naive component-channel comparison drifts within tens of steps."
tags: ["Cl(3,0)", "MHD", "Orszag-Tang", "pseudo-spectral"]
featured: true
streamlitSlug: "plasma-mhd"
vizComponent: "LatticeViz"
order: 2
---

A 2D incompressible ideal-MHD demo built around the divergence-free constraint on the magnetic field. The same Orszag-Tang vortex is evolved on two parallel tracks; the only thing that differs is the representation of **B**.

## The two tracks

**Clifford track** — B is a bivector, encoded via its scalar potential A: `B = (∂_y A, -∂_x A)`. Whatever the integrator does to A, the reconstruction of B is divergence-free at machine epsilon. Forever.

**Naive track** — B is two independent scalar channels `(B_x, B_y)`, each evolved by the induction equation:
`∂_t B + (v·∇)B - (B·∇)v = η∇²B`. Spectral truncation noise in the gradient operators accumulates, and `∇·B` grows unboundedly within ~100 steps.

The headline plot is `max |∇·B|` on a log axis. Clifford stays flat at ~10⁻¹⁴ (float64 noise). Naive blows up to O(10²) — a ratio of 10¹⁵ between the two representations of the same physics.

## Why it matters

The same divergence pathology in 3D shows up as **hallucinated magnetic monopoles** in fusion-reactor simulations. Standard ML approaches penalize the violation with a soft loss term; Clifford Neural Operators eliminate it structurally by treating the magnetic field as a bivector under the geometric product, where the exterior derivative is naturally div-free.

## Numerics

64×64 doubly-periodic grid (configurable up to 128²). Vorticity-streamfunction for the fluid + magnetic potential for the field. Pseudo-spectral derivatives via rFFT. Forward Euler in time. Backend: Modal CPU container, single FastAPI POST per run.

## What's coming next

A Cl(3,0) → Cl(3,1) extension (relativistic plasma) and direct comparison against a BOUT++ ground-truth run. The same demo also lays the substrate for a CNO-based plasma surrogate as a downstream product.
