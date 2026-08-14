Current state: the site has zero photography right now — the hero and every subpage header use pure-CSS motifs (rings, orbits), and the brand guide's own layout rule is "one focal symbol or image per composition" plus "remove decoration before reducing whitespace." So I didn't slot a photo into every section — that would fight the site's own restraint principle and turn into exactly the "dense" look it explicitly avoids.

Hands/objects, not posed people: the imagery rules ("intimate tables, tactile materials, hands in conversation," avoid "generic AI fantasy decoration") point toward close still-life shots, not full posed scenes with faces. That's also the pragmatic choice — Midjourney faces read as fake customer photos (which the brand rules explicitly forbid implying), and Midjourney hands are unreliable at full-body scale but fine in tight macro crops.

That leaves a curated set of 6 images, plus a shared style-lock suffix so they read as one system.

Style-lock suffix (append to every prompt)

editorial still-life photography, warm tungsten candlelight, shallow depth of
field, muted moody color grade, deep verdigris green and antique gold accents
against obsidian shadow, parchment cream highlights, fine film grain, no
visible face, no text, no logo, no glowing magic effects, no fantasy
creatures --v 6.1 --style raw

---
1. Homepage hero — optional
- Placement: layouts/index.html, .home-hero__grid right column — would replace the CSS .story-table rings, not sit alongside them (that column already has its one focal symbol). Swap is a markup change only, no CSS work.
- Size: square, 1200×1200px WebP (column renders ~360–580px; this covers 2–3x retina).
- Prompt: Close overhead view of a candlelit tabletop roleplaying setup: a hand-drawn parchment map partially unrolled, a small carved wooden token, a pair of worn dice, and a brass candle holder casting soft light across a dark wood table, one adult hand at the frame's edge turning the map, 85mm lens --ar 1:1 [+ style-lock]

2. /experience/ page hero
- Placement: layouts/_partials/page-hero.html, .page-hero__motif (currently the CSS .orbit rings, fixed 320×320px column). Needs a small partial edit to accept an optional image param.
- Size: square, 640×640px WebP.
- Prompt: Macro shot of a small hand-carved wooden token being placed onto a hand-drawn coastal map on a dark wood table, warm candlelight just outside frame, one adult hand mid-motion, 85mm lens --ar 1:1 [+ style-lock]

3. /about/ page hero
- Placement: same page-hero__motif slot, on the About page.
- Size: 640×640px WebP.
- Prompt: Overhead close-up of a game master's open preparation notebook on a dark wood table, handwritten notes in ink, a worn leather journal, a small brass compass, a lit taper candle at frame's edge, 85mm lens --ar 1:1 [+ style-lock]

4. /how-it-works/ page hero
- Placement: same slot, How It Works page.
- Size: 640×640px WebP.
- Prompt: Close overhead shot of two cups of tea, a folded handwritten letter, and a small stack of parchment note cards on a dark wood table, warm ambient candlelight, a quiet composition suggesting a private conversation, 85mm lens --ar 1:1 [+ style-lock]

5. /for-your-table/ page hero
- Placement: same slot, For Your Table page.
- Size: 640×640px WebP.
- Prompt: Close overhead shot of several different adult hands resting near a shared tabletop map and a small pile of dice and carved tokens, warm candlelight, a sense of a group gathered closely together, 85mm lens --ar 1:1 [+ style-lock]

6. /experience/ inline callout image — highest-value pick
- Placement: inside content/experience/index.md, directly above the "One possibility" callout. This literally illustrates the copy already there ("a hand-drawn coastal map unrolls, a low playlist eases in, and a small carved token passes to whoever speaks next"). Just a markdown ![]() insert — no template change needed. Prose column caps at 760px.
- Size: 1520×1013px WebP (3:2, 2x retina).
- Prompt: Wide close shot of a hand-drawn coastal map unrolling across a dark wood table lit by warm candlelight, a small carved wooden token mid-pass between two blurred adult hands at the frame's edges, a record player glowing softly out of focus in the background, 50mm lens --ar 3:2 [+ style-lock]

---
Deliberately skipped: /questions/ and /consultation/ heroes. The consultation page's own copy says "No commitment. No performance." — a moody fantasy photo there would undercut the plain, low-pressure tone those two pages are working hard to set. Keep them CSS-only.

Already covered, not regenerating: OG social card and favicon set exist (static/images/storyscape-social-card.png, static/favicon*) — worth noting the social card is 1.6MB PNG, which is heavy for what it is; re-exporting it as WebP at the same 1672×941 would be a quick win whenever you're touching images, but that's a separate small task from this list.
