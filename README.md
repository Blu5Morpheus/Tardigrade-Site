# tardigrade-site

The Astro static site for Tardigrade Innovation. Deploys to
`portfolio-lab-v05x.onrender.com` as a Render Static Site.

## Develop

```bash
npm install
npm run dev
```

Visits `http://localhost:4321`.

## Build

```bash
npm run build
npm run preview
```

`dist/` is the production output Render serves from.

## How to flip the shop live

When the Stripe Payment Links are ready:

1. Edit each file in `src/content/products/*.md`, fill in the `stripePaymentLink:` frontmatter
2. Edit `src/lib/config.ts`, set `SHOP_LIVE = true`
3. Commit, push, Render redeploys

That's the entire change. Everything else is staged for it.

## How to add a demo

1. Create `src/content/demos/my-slug.md` with the schema in `src/content/config.ts`
2. Pick a viz component from the existing set, or add one to `src/components/viz/`
3. The Streamlit demo router on the lab side must accept `?demo=my-slug`

## How to add a paper

1. Create `src/content/papers/my-slug.md` with the schema in `src/content/config.ts`
2. If you want a detail page, create `src/content/preprints/my-slug.md` and link the paper's
   `actionHref: /research/my-slug`

## How to add a product

1. Create `src/content/products/my-slug.md` with the schema in `src/content/config.ts`
2. Pick or add a viz component
3. When the shop is live, add the `stripePaymentLink:` frontmatter

## Configuration

`src/lib/config.ts` is the single source of truth for site URL, contact email,
shop gate, Streamlit host, and Formspree IDs.

`src/lib/nav.ts` is the single source of truth for nav.

See `LAUNCH_CHECKLIST.md` (in the parent build kit) for the consolidated list of
placeholders and items the operator owns before going live.

## Stack

- Astro 5.x (static-leaning)
- Tailwind 3.x (utility classes only)
- TypeScript strict mode
- Self-hosted Fraunces / JetBrains Mono / Inter Tight via `@fontsource(-variable)/*`
- MDX for long-form content
- Sitemap via `@astrojs/sitemap`

## Deploying

`render.yaml` at the repo root. Connect the repo to a Render Static Site, push to main,
done. URL preserved through Render's service-type change.
