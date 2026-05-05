---
title: "Lattice"
titleAccent: "gauge sandbox"
number: "04"
blurb: "U(1) and SU(2) plaquette dynamics on a 16⁴ lattice, with surrogate ML."
tags: ["Wilson", "surrogate"]
featured: false
streamlitSlug: "lattice"
vizComponent: "LatticeViz"
order: 4
---

Wilson-action lattice gauge theory with U(1) and SU(2) gauge groups, served alongside a neural surrogate that approximates the action under hypothetical update steps. The surrogate is what makes the demo interactive — full Monte Carlo on a 16⁴ lattice would be too slow for the browser.

## What you can do

- Switch between U(1) and SU(2)
- Adjust beta and watch the confinement-deconfinement transition
- Compare surrogate predictions to direct evaluation
