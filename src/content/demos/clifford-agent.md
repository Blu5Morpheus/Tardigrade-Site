---
title: "Clifford"
titleAccent: "geometric algebra"
number: "02"
blurb: "Embodied control system with Cl(3,1) equivariant layers — native rotation, boost, and reflection symmetries baked into the architecture, not learned."
tags: ["Cl(3,1)", "BOUT++", "Gymnasium", "tardigrade_agent"]
featured: true
streamlitSlug: "clifford"
vizComponent: "BlochViz"
order: 2
---

A neural architecture built directly on the Clifford geometric algebra Cl(3,1), with rotation, boost, and reflection symmetries native to the representation rather than imposed via auxiliary loss terms.

The initial application target is plasma instability control — the agent observes a BOUT++ plasma simulation and emits actuator commands to suppress edge-localized modes. Because the architecture is equivariant by construction, generalization across reference frames is structural rather than learned.

Released as the open-source `tardigrade_agent` Python package.

## Why Cl(3,1)

The (3,1) signature corresponds to 3+1-dimensional Minkowski spacetime. Putting the relativistic structure inside the architecture means the network does not need to discover Lorentz invariance from data — it has it for free. The same observation extends to lower-dimensional cases (Cl(3,0) for purely spatial problems) where rotation equivariance is the relevant structural prior.

## Hooks

- BOUT++ simulator integration via Gymnasium env
- Differentiable forward operator for end-to-end training
- Optional combination with the variational classifier (Demo 01) for joint physics-aware modelling
