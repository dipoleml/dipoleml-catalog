---
description: Place a design in the measured design space — nearest systems, per-axis percentiles, outliers
---

# /dna

Extract a site's design language and locate it in designlang's measured design
space: a 30-feature vector covering colour, type, space, shape and motion.

Unlike `/grade`, which returns an absolute letter, `/dna` is comparative — every
number is a rank against a corpus of real design systems.

## Usage

```bash
designlang dna <url>
designlang dna <url> --corpus ./my-corpus.json
```

Build your own reference frame — your products, your competitors, whatever you
want to be measured against:

```bash
designlang dna-corpus acme.com acme.com/pricing competitor.com
```

## What you get

- `*-dna.json` — the vector, the raw measurements behind it, neighbours, percentiles
- `*-dna.md` — a readable report: where it sits per axis, its nearest design
  systems, and the features that make it look the way it does

## Reading the output

- **Distance** is the mean absolute difference across the features both designs
  have — `0.14` means the average feature is 14% of its range apart.
- **Percentiles** are ranks within the corpus, not judgements. A design far from
  the middle is unusual, which may be exactly the intent.
- **Coverage** tells you how much of the vector was measurable. A comparison
  built from a third of the features is a weaker claim, and the report says so.

## Instructions

1. Run `designlang dna <url>` for the URL the user names.
2. Read the emitted `*-dna.md`.
3. Summarise: the nearest systems and what separates them, the axes where the
   design is an outlier, and — if the user is trying to hit a target look — which
   axes to move and in which direction.
4. If no corpus exists yet, say so and offer to build one with `dna-corpus`.
