# Artwork on the Storyscape site

## Current web placements

The Storyscape exemplar and client profiles use two AI-generated concept
scenes from the November 2026 [brand kit](../brand/README.md). The scenes
illustrate the atmosphere of a Storyscape session.

| Artwork | Current placement |
| --- | --- |
| The Prepared Table | Homepage hero and gallery, Experience hero, For Your Table hero |
| World in the Details | Homepage gallery, How It Works hero, Adventures hero |
| Storyscape link card | Open Graph and social preview metadata, and the exemplar brand guide |

Each hero scene offers 720 px and 1200 px WebP renditions with descriptive alt
text and a visible “AI-generated concept artwork” caption. The gallery uses
the 720 px files and has its own captions. Storyscape pages without a scene,
including Questions and Consultation, use text-only headers. The fictional
Wayfarer Table profile uses the CSS hero motif and its own example social SVG.

## Edit or replace an export

Keep scene masters in [brand/assets/imagery](../brand/assets/imagery/) and
web renditions in [static/images/storyscape](../static/images/storyscape/).
Follow the [visual standards](../brand/visual-standards.md) for new crops
and record provenance and intended use in the
[asset register](../brand/ASSET_REGISTER.md).

Update [storyscape_artwork.yaml](../data/storyscape_artwork.yaml) to change
hero image paths and alt text. Standalone pages choose an entry with
`heroArtwork` in front matter. The homepage hero selects `prepared-table`
in its [module template](../layouts/_partials/sections/hero.html). Update
the separate gallery records in [home.yaml](../data/home.yaml) when a scene
changes there too. The social image is `images/storyscape/social-link.png`
(1200 × 630 px), configured with its alt text in [hugo.yaml](../hugo.yaml).
The existing favicon family still uses the BS utility seal.

Record any changed public filenames in [data/release.json](../data/release.json)
and build the intended profile to check the generated references. Inspect the
hero crops at mobile and desktop sizes and keep concept art labeled wherever
it appears.

Background hero scenes (`images/home-hero.webp`, `images/about-hero.webp`,
`images/experience-hero.webp`, `images/for-your-table-hero.webp`, and
`images/how-it-works-hero.webp`) are layered via `--hero-photo` on `.home-hero`
and `.page-hero` (`0.22` opacity in dark mode, `0.1` in light mode), and
`images/closing-cta-bg.webp` backs `.closing-cta`. Seamless `.webp` material
textures (`texture-canvas-grain.webp`, `texture-cartography-lines.webp`,
`texture-linen-weave.webp`, `texture-walnut-grain.webp`, `texture-forest-felt.webp`,
and `texture-parchment.webp`) are mapped by section role in
[visual-standards.md](../brand/visual-standards.md) and
`assets/scss/_tokens.scss`. `images/experience-callout.webp` and
`images/storyscape-social-card.png` remain declared static files without
current page placement.

## Earlier six-scene concept brief

The original brief called for close still lifes of hands, maps, and tabletop
objects, with one focal image per composition. These prompts document the
earlier art direction. Use the current brand standards for new work and the
asset register for verified provenance.

The brief used this shared Midjourney suffix.

editorial still-life photography, warm tungsten candlelight, shallow depth of
field, muted moody color grade, deep verdigris green and antique gold accents
against obsidian shadow, parchment cream highlights, fine film grain, no
visible face, no text, no logo, no glowing magic effects, no fantasy
creatures --v 6.1 --style raw

---
1. Homepage hero
- Planned size: 1200 × 1200 px WebP.
- Prompt: Close overhead view of a candlelit tabletop roleplaying setup: a hand-drawn parchment map partially unrolled, a small carved wooden token, a pair of worn dice, and a brass candle holder casting soft light across a dark wood table, one adult hand at the frame's edge turning the map, 85mm lens --ar 1:1 [+ style-lock]

2. Experience hero
- Planned size: 640 × 640 px WebP.
- Prompt: Macro shot of a small hand-carved wooden token being placed onto a hand-drawn coastal map on a dark wood table, warm candlelight just outside frame, one adult hand mid-motion, 85mm lens --ar 1:1 [+ style-lock]

3. About hero
- Planned size: 640 × 640 px WebP.
- Prompt: Overhead close-up of a game master's open preparation notebook on a dark wood table, handwritten notes in ink, a worn leather journal, a small brass compass, a lit taper candle at frame's edge, 85mm lens --ar 1:1 [+ style-lock]

4. How It Works hero
- Planned size: 640 × 640 px WebP.
- Prompt: Close overhead shot of two cups of tea, a folded handwritten letter, and a small stack of parchment note cards on a dark wood table, warm ambient candlelight, a quiet composition suggesting a private conversation, 85mm lens --ar 1:1 [+ style-lock]

5. For Your Table hero
- Planned size: 640 × 640 px WebP.
- Prompt: Close overhead shot of several different adult hands resting near a shared tabletop map and a small pile of dice and carved tokens, warm candlelight, a sense of a group gathered closely together, 85mm lens --ar 1:1 [+ style-lock]

6. Experience callout
- Planned size: 1520 × 1013 px WebP.
- Prompt: Wide close shot of a hand-drawn coastal map unrolling across a dark wood table lit by warm candlelight, a small carved wooden token mid-pass between two blurred adult hands at the frame's edges, a record player glowing softly out of focus in the background, 50mm lens --ar 3:2 [+ style-lock]
