# Storyscape visual standards

November 2026 · Companion to the [illustrated brand standards](brand-standards.pdf) and [identity and glyph usage](visual-usage.md).

A Storyscape composition should feel like a table that has been prepared for friends. A clear invitation, a tactile object, and a single imaginative detail are enough to establish the setting. The established dark and light themes cover different reading conditions.

## Color

The core swatches come from [brand data](../data/brand.yaml) and the [SCSS tokens](../assets/scss/_tokens.scss). For new web work, use the semantic variables for text, actions, focus, and status.

| Swatch | sRGB | Role |
| --- | --- | --- |
| Obsidian | `#0C100F` | Dark canvas and primary light-field ink |
| Parchment | `#EEE5D4` | Light canvas and dark-field type |
| Dark verdigris | `#1E6658` | Signature accent field; pair with Parchment |
| Bright mint | `#73D0AB` | Dark-theme focus and small interactive cues |
| Antique gold | `#C19A52` | Fine details, hairlines, and ceremonial accents |
| Deep forest | `#163830` | Secondary dark surfaces and CTA panels |

Use mostly one ground and one text color. Add one supporting field and a small accent when a hierarchy needs it. For readable gold-colored copy on Parchment, use the light-theme gold ink `#76571D`.

| Foreground and background | Contrast | Placement |
| --- | --- | --- |
| Parchment on Obsidian | 15.31:1 | Body, headings, and labels |
| Parchment on Deep forest | 10.22:1 | Dark sections and print CTA panels |
| Parchment on Dark verdigris | 5.42:1 | Signature field text |
| Bright mint on Obsidian | 10.34:1 | Dark focus and interactive accent |
| Dark gold ink on Parchment | 5.33:1 | Small light-theme labels |
| Antique gold on Parchment | 2.10:1 | Decorative rule |
| Bright mint on Parchment | 1.48:1 | Decorative accent |

These are calculated solid-color pairings. Inspect live hover, focus, disabled, and error states where opacity, photographs, gradients, or neighboring colors affect the effective contrast. Carry meaning in text and shape as well as color. Reserve bright mint for dark-field emphasis. Use the live light-theme focus color `#155B4E` against light surfaces.

## Typography and composition

**Cormorant Garamond** gives the voice to headlines, short story excerpts, and ceremonial lines. Use Manrope for instructions, body text, buttons, navigation, forms, contact information, and anything a guest needs to find quickly. Both are self-hosted on the site under their [font licenses](../LICENSES/).

| Role | Large screen reference | Small screen reference |
| --- | --- | --- |
| Hero | 76 / 80 px | 52 / 54 px |
| Section heading | 48 / 54 px | 38 / 42 px |
| Subsection | 28 / 34 px | 25 / 31 px |
| Large body | 20 / 32 px | 19 / 30 px |
| Body | 17 / 28 px | 16 / 27 px |

These are editorial reference sizes from the Hugo guide. Live components can scale fluidly. Let long headings wrap, keep essential copy in sentence case, and aim for body measures around 60–70 characters. Use normal tracking in body copy and reserve spaced capitals for brief metadata. On screen, check small widths and zoom with the actual text and fonts.

Use the established 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px spacing scale. Align practical information to a clear left edge. Use a single focal image, a thin rule to mark a transition, and mostly square corners. Give the brand name and key action generous clearance. Position a real label next to a glyph and make the entire control easy to target. Keep the skip link, meaningful focus, and visible text labels for fields. Let a reader pause decorative motion and honor the reduced-motion setting.

### Material surfaces and texture mapping

Tactile `.webp` textures are assigned consistently by section role through shared SCSS mixins in `assets/scss/_tokens.scss` rather than ad-hoc per-page styling:

| Material | Asset | Brand role | Assigned sections |
| --- | --- | --- | --- |
| Canvas grain | `images/texture-canvas-grain.webp` | Base matte ground across dark and light themes | `body` |
| Cartographic contours | `images/texture-cartography-lines.webp` | Discovery, story openings, and map motif | Proof strip, Adventures section, Gallery section, Philosophy mark |
| Woven linen | `images/texture-linen-weave.webp` | Cards, invitations, and editorial callouts | Module cards, Adventure cards, Content callouts |
| Walnut grain | `images/texture-walnut-grain.webp` | Structural and grounding bands | Packages band, Location band |
| Forest felt | `images/texture-forest-felt.webp` | Guided table and step-by-step process band | Process section (`.section--forest`) |
| Aged parchment | `images/texture-parchment.webp` | High-contrast editorial reassurance band | Reassurance section (`.section--parchment`) |
| Tabletop concept scenes | `images/*-hero.webp`, `images/closing-cta-bg.webp` | Atmospheric entry and closing bookends | Home hero, Interior page heroes, Closing CTA |

## Photography and art direction

### The Prepared Table

[Open the board](mood-boards/prepared-table.png) · [Open the scene](assets/imagery/prepared-table.webp)

Hospitality comes through the ordinary, cared-for setting. Frame at seated eye level and look for a natural hand gesture, an open seat, or the shared moment of passing a map. Choose walnut, linen, ordinary glass, and one warm lamp. Use this look for an introduction, a homepage hero, a partner handoff, or the host one-sheet. Preserve the gesture and some visible table surface when cropping tight.

Suggested description: “An unrolled cream shoreline map rests beside a brass die, folded linen, and a glass of water on a warmly lit walnut table.”

### World in the Details

[Open the board](mood-boards/world-in-the-details.png) · [Open the scene](assets/imagery/world-in-the-details.webp)

Preparation becomes visible in the objects. Frame from overhead or just above the surface. Light uncoated paper from the side so fibers, map lines, cloth, and brass are legible. Use this look for the guest invitation, an adventure preview, or an editorial story about what is prepared. Leave the primary detail clear at thumbnail scale.

Suggested description: “A brass die and pencil rest beside a hand-drawn shoreline on cream paper.”

For future commissioned photography, capture one wide establishing image and a crop-safe detail for each scene. Keep faces and identifiable details out of the frame unless the intended use has consent. Use neutral props and keep readable type out of the image area. Choose real room and material details that a host would recognize.

## Artwork and output

- **Website and email.** Preserve the wordmark’s aspect ratio and place it on a flat contrasting field. Put the offer and action in selectable text. Use responsive image sizes and review the mobile crop and contrast where a photograph meets type.
- **Social and link previews.** Start with the [three exports](collateral/). Keep the visible copy in the accompanying caption or alt text. Suggested composite alt text: “Binyled’s Storyscape. You host the people. I host the world. Private in-home tabletop adventures in Bentonville and Northwest Arkansas. Illustrative tabletop scene.” Review the crop for the intended destination.
- **Print.** The host one-sheet is US Letter and the invitation is 5 × 7 inches. Both are RGB PDFs for digital sharing and local print proofs, with selectable type. Print at actual size first. Ask the printer for its bleed, trim, color profile, and PDF requirements for a commercial run. Share the invitation details in text when sending digitally.
- **Hand-off.** Provide the SVG master for scaling and the PNG for simple placements. Include the asset credit and appropriate copy. Use flat single-color art for single-ink applications and ask for an actual-size proof before producing stationery, embossing, or merchandise.
- **Review.** Confirm official name, clear descriptor, legibility, usable crop, descriptive text alternative, accurate image caption, and the intended service or exemplar status. Check working destinations before adding a link or QR code. Use only verified details and the permissions needed for the placement.
