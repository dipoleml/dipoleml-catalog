# Content Plugin

Tools for bootstrapping content creation including blog posts and conference talks.

## Skills

### blog-post-writer

Transforms brain dumps into polished blog posts in Nick Nisi's voice.

Use this when you have scattered ideas, talking points, and conclusions that need organization into a cohesive narrative with a conversational, authentic tone.

**Example usage:**

```
/blog-post-writer

[provide your brain dump of ideas, code examples, observations, etc.]
```

The skill will:

- Gather constraints (target length, audience, draft vs revision)
- Fetch your latest posts from nicknisi.com for live voice calibration
- Choose the best narrative framework for the content
- Structure your unorganized thoughts into a post with proper Astro frontmatter
- Apply Nick's writing voice and tone throughout

**Bundled references:**

- `voice-tone.md` - Writing style guide
- `post-template.md` - Astro frontmatter schema and output format
- 27 narrative framework references (loaded selectively, auto-selected based on content)

### tighten-prose

A final editing pass that catches and removes AI-detectable writing patterns. Scans prose for statistically overrepresented AI tells — vocabulary clusters, inflated significance, formulaic transitions, and more — then rewrites flagged sections.

Use standalone on any writing, or as a composable quality gate in other skills (blog-post-writer runs it automatically as its final step).

**Example usage:**

```
/tighten-prose

[paste or reference the text to tighten]
```

The skill will:

- Load the AI tells catalog and fetch live patterns from Wikipedia
- Scan for pattern density across 12 categories
- Report clusters (not individual hits — density is the signal)
- Rewrite flagged sections while preserving voice and meaning

**Bundled references:**

- `ai-tells.md` - Full catalog of AI writing tells with examples and fix strategies

### conference-talk-builder

Creates conference talk outlines and slide-by-slide content plans using narrative frameworks. Tool-agnostic — outputs a talk script you can feed into Slidev, Gamma, iA Presenter, or any slide tool.

Use this when you need to structure a tech talk, create presentation content, or organize talk ideas into a story-driven format.

**Example usage:**

```
/conference-talk-builder

I want to create a talk about [your topic]
```

The skill will:

- Gather information about your talk topic, audience, and duration
- Auto-suggest from 22 narrative frameworks using a scoring algorithm
- Build a slide-by-slide talk script with speaker notes in Nick's voice
- Iterate on pacing, narrative arc, and content density

**Bundled references:**

- `voice-tone.md` - Nick's voice and tone guide for speaker notes
- `framework-guide.md` - Framework selection algorithm with scoring matrix
- `frameworks/` - 22 narrative framework references (Foundational, Existential, Absurdist, Non-linear, Rhetorical)

## Narrative Frameworks

Both skills support narrative frameworks auto-selected based on content type. The blog-post-writer has 27 frameworks (including blog-specific ones like SCQA, Progressive Disclosure, and PAS). The conference-talk-builder has 22 frameworks adapted for talk delivery. See individual reference files in `skills/blog-post-writer/references/` and `skills/conference-talk-builder/references/frameworks/` for details.

## Installation

```bash
/plugin marketplace add nicknisi/claude-plugins
/plugin install content@nicknisi
```

## Version

0.6.0
