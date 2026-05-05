import { defineCollection, z } from 'astro:content';

const demos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleAccent: z.string().optional(),
    blurb: z.string(),
    number: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    streamlitSlug: z.string(),
    vizComponent: z.enum([
      'WaveformViz',
      'BlochViz',
      'LatticeViz',
      'PreprintViz',
      'ScopeViz',
    ]),
    order: z.number(),
  }),
});

const papers = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string().optional(),
    year: z.number(),
    status: z.enum(['in-progress', 'draft', 'published', 'patent-wip']),
    actionLabel: z.string(),
    actionHref: z.string(),
    order: z.number(),
  }),
});

const products = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    nameAccent: z.string().optional(),
    category: z.enum(['hardware', 'digital', 'service']),
    categoryLabel: z.string(),
    blurb: z.string(),
    price: z.string(),
    priceUnit: z.string().optional(),
    stripePaymentLink: z.string().url().optional(),
    vizComponent: z.enum([
      'AntennaViz',
      'BlochViz',
      'ScopeViz',
      'DiamondViz',
      'PreprintViz',
      'FlaskViz',
    ]),
    inStock: z.boolean().default(true),
    order: z.number(),
  }),
});

const preprints = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string().optional(),
    year: z.number(),
    status: z.enum(['in-preparation', 'on-arxiv', 'published']),
    arxivId: z.string().optional(),
    arxivUrl: z.string().url().optional(),
    pdfUrl: z.string().url().optional(),
    codeUrl: z.string().url().optional(),
    abstract: z.string(),
    order: z.number(),
  }),
});

export const collections = { demos, papers, products, preprints };
