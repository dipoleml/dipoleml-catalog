# Prompting Guide

Domain-specific prompt patterns for Nano Banana image generation. Use these as templates — adapt to the specific request.

## General Formula

"A [style] [shot type] of [subject], [action/pose], in [environment]. [Lighting]. [Mood/atmosphere]. [Technical details]."

## Website & UI Visuals

### Hero Images
"A wide cinematic shot of [scene], [atmosphere]. Soft ambient lighting, [color palette] tones. Clean, modern, suitable for a tech website hero section. 16:9 aspect ratio."

### Placeholder / Mockup Images
"A clean, professional [subject] on a [background]. Neutral tones, even studio lighting. Minimal, suitable as a placeholder visual for [context]."

### Product Cards / Thumbnails
"A product shot of [item] on a clean white background. Soft diffused studio lighting, subtle shadow. Centered composition."

### Team / Avatar Photos
"A professional headshot of [description], warm natural lighting, shallow depth of field, neutral office background. Friendly expression."

### Background / Texture
"An abstract [texture/pattern] in [color palette]. Seamless, subtle, suitable as a website background. Soft gradient."

## Photorealistic

"A photorealistic [shot type] of [subject], [action], set in [environment]. [Lighting type] lighting, [mood]. Shot on [camera] with [lens]. [Film grain/color grade]."

Shot types: close-up, medium shot, wide angle, aerial, macro, portrait, establishing shot.
Lighting: golden hour, studio softbox, harsh overhead, neon, candlelight, overcast.

## Illustration & Art

"A [art style] illustration of [subject] in [setting]. [Color palette]. [Medium]. [Mood]."

Art styles: watercolor, flat vector, isometric, line art, oil painting, pixel art, comic book, art nouveau, minimalist, geometric.

## Icons & Logos

"A minimal [style] icon of [subject]. Flat design, [color] on [background]. Clean lines, simple shapes, suitable for UI."

"A modern logo mark for [brand concept]. Geometric, minimal, [color palette]. Scalable, works at small sizes."

## Social Media

"A bold, eye-catching [subject] for [platform]. Vibrant colors, high contrast. [Style]. Text-safe composition with clear focal point."

Platform ratios: Instagram 1:1 or 4:5, Stories 9:16, Twitter 16:9, LinkedIn 1:1.

## Text in Images

Put text in quotes within the prompt. Specify font style and placement:
"[Scene description]. The text '[YOUR TEXT]' in [font style] font, [placement], [color] on [background]."

Pro model (`--resolution 2K` or `4K`) produces significantly better text rendering.

## Editing Prompts

Be specific about what to change AND what to preserve:
- "Replace the sky with a dramatic sunset while keeping the foreground buildings unchanged"
- "Remove the person on the left side of the image"
- "Change the wall color to deep navy blue, keep furniture unchanged"
- "Add warm string lights to the outdoor patio area"

## Style Transfer Prompts

"Apply the artistic style of the first image to the content of the second image. Preserve the composition and subjects but transform the visual style, colors, and textures."

Variations: "...in the painting style of...", "...with the color palette of...", "...using the texture and brushwork of..."
