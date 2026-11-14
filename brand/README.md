# Binyled’s Storyscape brand and marketing kit

Owner edition · November 12, 2026

**You host the people. I host the world.** Binyled’s Storyscape is the identity for a private in-home tabletop adventure shaped around a host and their guests in Bentonville and Northwest Arkansas. **The Private Storyscape** is the named one-evening offer.

Open the [illustrated brand standards](brand-standards.pdf) for a nine-page overview of the identity, typography, color, imagery, glyphs, and applications. Use the files below when producing new material or deciding whether to activate the service.

## Strategy and voice

| File | Use it to |
| --- | --- |
| [Positioning](strategy/POSITIONING.md) | Explain what the host gets, who it fits, and how the service identity relates to the modular Hugo toolkit. |
| [SWOT and market context](strategy/SWOT.md) | Review the November 12 comparator snapshot and decide what to validate next. |
| [Messaging and copy](marketing/MESSAGING.md) | Apply the voice and adapt headlines, page copy, metadata, and social captions. |
| [Campaign playbook](marketing/CAMPAIGN.md) | Choose an exemplar, portfolio, or active service mode and plan a bounded campaign. |
| [Media and partner kit](marketing/MEDIA_KIT.md) | Pull an appropriate fact sheet, boilerplate, announcement, partner introduction, and artwork. |
| [Consultation and client communications](marketing/CONSULTATION.md) | Adapt inquiry replies, scope notes, guest orientation, and follow-up. |

## Visual system

| File | Use it to |
| --- | --- |
| [Visual standards](visual-standards.md) | Apply color, type, layout, photo direction, accessibility, and production rules. |
| [Identity and glyph usage](visual-usage.md) | Choose a lockup, size the mark, and select a glyph by meaning. |
| [Identity specimen](assets/identity/identity-specimen.svg) · [Masters and PNGs](assets/identity/) | Review or export the name, descriptor lockups, and utility seals. |
| [Glyph specimen](assets/glyphs/glyph-sheet.svg) · [Individual SVGs](assets/glyphs/) · [Sprite](assets/glyphs/glyph-sprite.svg) | Use the 12-symbol family in interfaces and collateral. |
| [The Prepared Table](mood-boards/prepared-table.png) · [World in the Details](mood-boards/world-in-the-details.png) | Brief a photographer, choose a crop, or review a proposed scene. |
| [Asset register and prompts](ASSET_REGISTER.md) | Trace asset origin and understand release and reuse status. |

## Collateral

| File | Intended placement |
| --- | --- |
| [Host one-sheet](collateral/host-one-sheet.pdf) | US Letter service concept preview. Add the approved contact before preparing a service edition. |
| [Guest invitation](collateral/guest-invitation.pdf) | 5 × 7 inch specimen with a fictional Lantern Bay opening. |
| [Link artwork](collateral/social-link.png) | 1200 × 630 px link previews and wide editorial cards. |
| [Portrait artwork](collateral/social-portrait.png) | 1080 × 1350 px portrait posts. |
| [Square artwork](collateral/social-square.png) | 1080 × 1080 px square placements. |
| [Editable copy](collateral/copy.json) · [Export source](render.py) | Customize contact details, invitation logistics, and shared copy, then regenerate. |

## Using the kit

The default `exemplar` build presents The Private Storyscape in service language and links to a disabled consultation preview. For a public portfolio, add the example framing at the entry point and use a clearly labeled sample such as Lantern Bay. For an active service, confirm the intended scope, area, availability, quote process, contact destination, and ability to receive and handle an inquiry. The `client` profile hides internal guides. The configured intake backend determines whether the consultation is active. [Lantern Bay](../examples/lantern-bay/README.md) · [Site operations](../docs/site-operations.md) · [Readiness ledger](../docs/readiness.md)

The Hugo guide draws from the brand data and SCSS tokens. Selected web copies under `static/images/storyscape/` supply the Storyscape wordmark, process glyphs, responsive concept scenes, and link preview. The owner kit under `brand/` holds the masters, print collateral, and strategy drafts. [Brand data](../data/brand.yaml) · [SCSS tokens](../assets/scss/_tokens.scss) · [Web exports](../static/images/storyscape/) · [Reuse policy](../REUSE.md)

### Regenerate the exports

The finished files can be opened directly. To regenerate, edit [copy.json](collateral/copy.json) and run from the repository root with Python, Pillow, ReportLab, FreeType with WOFF2 support, Node with Sharp available on its module path, and Poppler. The renderer uses the project’s own fonts and source imagery.

```sh
python3 brand/render.py
```

If FreeType lives outside standard locations, set `STORYSCAPE_FREETYPE` to the library file. To use the bundled Codex dependencies, put its Node package directory on `NODE_PATH` and invoke its bundled Python. The renderer replaces the brand standards PDF, mood-board PNGs, and collateral PDFs and PNGs under `brand/`. When changing an asset used by Hugo, update the corresponding static copy deliberately. Inspect the resulting crop and text after editing, and keep actual guest logistics in a private copy.
