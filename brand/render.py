"""Build the local Storyscape brand book and collateral from repository sources."""

from ctypes import CDLL, byref, c_long, c_ulong, c_void_p, create_string_buffer
from ctypes.util import find_library
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


BRAND = Path(__file__).resolve().parent
ASSETS = BRAND / "assets"
COLLATERAL = BRAND / "collateral"
COPY = json.loads((COLLATERAL / "copy.json").read_text(encoding="utf-8"))
BOOK_SIZE = (960, 600)
DISPLAY = "Cormorant"
BODY = "Manrope"
COLORS = {
    "Obsidian": "#0C100F",
    "Parchment": "#EEE5D4",
    "Verdigris": "#1E6658",
    "Mint": "#73D0AB",
    "Antique gold": "#C19A52",
    "Deep forest": "#163830",
}
INK, PAPER, GREEN, MINT, GOLD, FOREST = COLORS.values()
DARK_GOLD = "#76571D"
MUTED = "#514E47"
DISPLAY_FILE = "cormorant-garamond-latin"
BODY_FILE = "manrope-latin"


def export_fonts(directory):
    """Decode the site's WOFF2 fonts for PDF embedding via FreeType."""
    library_path = os.environ.get("STORYSCAPE_FREETYPE") or find_library("freetype")
    if library_path is None:
        library_path = next((str(path) for path in (
            Path("/opt/homebrew/lib/libfreetype.dylib"),
            Path("/usr/local/lib/libfreetype.dylib"),
        ) if path.is_file()), None)
    if library_path is None:
        raise RuntimeError("FreeType with WOFF2 support is required to embed the site fonts.")
    ft = CDLL(library_path)
    library = c_void_p()
    if ft.FT_Init_FreeType(byref(library)):
        raise RuntimeError("Could not initialize FreeType.")
    try:
        for name, basename in ((DISPLAY, DISPLAY_FILE), (BODY, BODY_FILE)):
            source = BRAND.parent / "static" / "fonts" / f"{basename}.woff2"
            face = c_void_p()
            if ft.FT_New_Face(library, bytes(source), c_long(0), byref(face)):
                raise RuntimeError(f"Could not open {source.name}. Check FreeType WOFF2 support.")
            try:
                size = c_ulong()
                ft.FT_Load_Sfnt_Table(face, c_ulong(0), c_long(0), None, byref(size))
                if not size.value:
                    raise RuntimeError(f"Could not read the SFNT data from {source.name}.")
                buffer = create_string_buffer(size.value)
                if ft.FT_Load_Sfnt_Table(face, c_ulong(0), c_long(0), buffer, byref(size)):
                    raise RuntimeError(f"Could not decode {source.name}.")
                target = directory / f"{name}.ttf"
                target.write_bytes(buffer.raw)
                pdfmetrics.registerFont(TTFont(name, str(target)))
            finally:
                ft.FT_Done_Face(face)
    finally:
        ft.FT_Done_FreeType(library)


def photo(name, size, center):
    with Image.open(ASSETS / "imagery" / f"{name}.webp") as source:
        return ImageOps.fit(source.convert("RGB"), size, Image.Resampling.LANCZOS, centering=center)


class Page:
    def __init__(self, canvas, size):
        self.canvas = canvas
        self.width, self.height = size

    def rect(self, x, y, width, height, color):
        self.canvas.setFillColor(HexColor(color))
        self.canvas.rect(x, self.height - y - height, width, height, fill=1, stroke=0)

    def line(self, x1, x2, y, color=GOLD):
        self.canvas.setStrokeColor(HexColor(color))
        self.canvas.setLineWidth(0.6)
        self.canvas.line(x1, self.height - y, x2, self.height - y)

    def text(self, x, y, value, size, color=INK, font=BODY, spacing=0, weight=0.15):
        output = self.canvas.beginText(x, self.height - y)
        output.setFont(font, size)
        output.setFillColor(HexColor(color))
        output.setCharSpace(spacing)
        if font == BODY and weight:
            self.canvas.saveState()
            self.canvas.setStrokeColor(HexColor(color))
            self.canvas.setLineWidth(weight)
            output.setTextRenderMode(2)
        output.textOut(value)
        self.canvas.drawText(output)
        if font == BODY and weight:
            self.canvas.restoreState()

    def body(self, x, y, value, width, size=15, color=INK, leading=None, font=BODY):
        leading = leading or size * 1.45
        for paragraph in value.splitlines():
            for line in simpleSplit(paragraph, font, size, width):
                self.text(x, y, line, size, color, font)
                y += leading
        return y

    def label(self, x, y, value, color=DARK_GOLD):
        self.text(x, y, value.upper(), 10.5, color, spacing=1.5, weight=0.25)

    def image(self, name, x, y, width, height, center=(0.5, 0.5)):
        pixels = (round(width * 3), round(height * 3))
        cropped = photo(name, pixels, center)
        buffer = BytesIO()
        cropped.save(buffer, format="JPEG", quality=91, optimize=True)
        self.canvas.drawImage(ImageReader(buffer), x, self.height - y - height, width, height)

    def svg(self, source, x, y, width, height, scratch):
        target = scratch / f"{source.stem}.png"
        if not target.exists():
            subprocess.run([
                "node", "-e",
                "require('sharp')(process.argv[1], {density: 300}).png()"
                ".toFile(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });",
                str(source), str(target),
            ], check=True)
        image = ImageReader(str(target))
        pixel_w, pixel_h = image.getSize()
        scale = min(width / pixel_w, height / pixel_h)
        drawn_w, drawn_h = pixel_w * scale, pixel_h * scale
        self.canvas.drawImage(
            image, x, self.height - y - drawn_h, drawn_w, drawn_h, mask="auto",
        )

    def heading(self, kicker, title, dark=False):
        foreground, background = (PAPER, INK) if dark else (INK, PAPER)
        self.rect(0, 0, self.width, self.height, background)
        self.label(54, 56, kicker, GOLD if dark else DARK_GOLD)
        self.text(54, 113, title, 58, foreground, DISPLAY)

    def footer(self, number, dark=False, label="Binyled’s Storyscape  /  Brand standards"):
        self.line(54, self.width - 54, 550)
        color = PAPER if dark else MUTED
        self.text(54, 573, label, 10.5, color)
        self.text(self.width - 76, 573, f"{number:02}", 10.5, color)
        self.canvas.showPage()

    def entry(self, x, y, title, copy, width, dark=False):
        foreground = PAPER if dark else INK
        self.text(x, y, title, 26, foreground, DISPLAY)
        return self.body(x, y + 26, copy, width, 15, foreground) + 24


def new_canvas(path, size, title):
    canvas = Canvas(str(path), pagesize=size, pageCompression=1, invariant=1)
    canvas.setTitle(title)
    canvas.setAuthor(COPY["brand"])
    return canvas


def cover(page):
    page.rect(0, 0, 960, 600, INK)
    page.image("prepared-table", 419, 0, 541, 600, (0.75, 0.5))
    page.label(54, 68, "Brand standards", GOLD)
    page.line(54, 368, 84)
    page.text(50, 204, "Binyled’s", 80, PAPER, DISPLAY)
    page.text(50, 278, "Storyscape", 80, PAPER, DISPLAY)
    page.body(56, 337, "Private in-home tabletop adventures", 294, 17, PAPER)
    for index, line in enumerate(COPY["promise"]):
        page.text(54, 436 + 32 * index, line, 29, PAPER, DISPLAY)
    page.label(54, 556, "November 2026  /  Owner edition", GOLD)
    page.canvas.showPage()


def position(page):
    page.heading("Positioning", "A world prepared for your table.")
    page.body(54, 153,
              "A single-evening, consultation-first tabletop roleplaying concept "
              "for private hosts in Bentonville and Northwest Arkansas.", 680, 19)
    page.line(54, 906, 204)
    page.entry(54, 257, "The host’s job",
               "Gather friends and share what would make the evening work for them. Sit down and play.",
               370)
    page.entry(515, 257, "The practitioner’s job",
               "Shape the adventure, welcome mixed experience levels, and guide the choices and pace.",
               370)
    page.entry(54, 405, "The Private Storyscape",
               "The named one-evening offer. Confirm scope, date, practical details, and group fit privately.",
               370)
    page.entry(515, 405, "The voice",
               "Gracious, assured, imaginative. Speak as one practitioner. Show an act of care before opening the fictional world.",
               370)
    page.footer(2)


def identity(page, scratch):
    page.heading("Identity", "The wordmark leads.")
    page.body(54, 154,
              "Use the name as the visible identifier. The BS utility seal supports small digital placements.",
              820)
    width = 412
    for x, surface, variant in ((54, "#F5EDDE", "dark"), (494, FOREST, "light")):
        page.rect(x, 187, width, 182, surface)
        page.svg(ASSETS / "identity" / f"lockup-{variant}.svg",
                 x + 26, 235, width - 52, 103, scratch)
    page.label(54, 391, "Obsidian ink on light")
    page.label(494, 391, "Parchment ink on dark")
    page.svg(ASSETS / "identity" / "utility-seal.svg", 54, 422, 74, 74, scratch)
    page.body(150, 449,
              "Keep the seal for the favicon or small utility use. Give the full name room to read. "
              "Use the SVG masters for export and preserve their aspect ratio.", 715)
    page.footer(3)


def color_and_type(page):
    page.heading("Visual foundations", "Palette & typography")
    swatch_width = 136
    for index, (name, color) in enumerate(COLORS.items()):
        x = 54 + index * 144
        if color == PAPER:
            page.rect(x - 0.5, 146.5, swatch_width + 1, 92, "#B8AA91")
        page.rect(x, 147, swatch_width, 91, color)
        swatch_ink = PAPER if name in {"Obsidian", "Verdigris", "Deep forest"} else INK
        page.text(x + 11, 220, color, 13, swatch_ink)
        page.text(x, 263, name, 12, INK, weight=0.28)
    page.body(54, 306,
              "Ground each layout in Obsidian, Parchment, or Deep forest. Use Verdigris for a signature field, "
              "Mint for dark-field focus, and Antique gold for rules or small ceremonial details.", 840)
    page.line(54, 906, 359)
    page.text(54, 417, "Cormorant Garamond", 44, INK, DISPLAY)
    page.text(524, 417, "Manrope", 34, INK, weight=0.33)
    page.body(54, 449, "Display, section headings, and short ceremonial lines. "
              "Give the letterforms breathing room.", 375)
    page.body(524, 449, "Body, captions, navigation, form labels, and buttons. "
              "Keep directions left aligned and sentence case.", 350)
    page.footer(4)


def mood(page, number, name, title, copy, direction, use, colors, dark):
    page.heading("Art direction", title, dark)
    foreground = PAPER if dark else INK
    accent = GOLD if dark else DARK_GOLD
    page.image(name, 54, 149, 548, 365, (0.5, 0.5))
    page.label(636, 163, "What it communicates", accent)
    page.body(636, 189, copy, 267, 16, foreground)
    page.label(636, 292, "Light & material", accent)
    page.body(636, 318, direction, 267, 15, foreground)
    page.label(636, 397, "Best placement", accent)
    page.body(636, 423, use, 267, 15, foreground)
    for index, color in enumerate(colors):
        x = 636 + index * 68
        if color == (INK if dark else PAPER):
            page.rect(x - 0.5, 478.5, 61, 36, "#958671")
        page.rect(x, 479, 60, 35, color)
    page.footer(number, dark, "Binyled’s Storyscape")


def glyphs(page, scratch):
    page.heading("Glyph system", "A visual cue for each step.")
    page.body(54, 152,
              "Pair a single glyph with a clear label. Reserve the small symbols for wayfinding and supporting detail.",
              839)
    folder = ASSETS / "glyphs"
    masters = sorted(file for file in folder.glob("*.svg") if file.name not in {"glyph-sheet.svg", "glyph-sprite.svg"})
    if not 1 <= len(masters) <= 16:
        raise ValueError("The glyph specimen supports one to sixteen standalone masters.")
    columns = 4
    for index, file in enumerate(masters):
        x = 54 + index % columns * 216
        y = 187 + index // columns * 72
        page.rect(x, y, 202, 57, "#F5EDDE")
        page.svg(file, x + 15, y + 13, 31, 31, scratch)
        page.text(x + 56, y + 34, file.stem.replace("-", " ").capitalize(), 12.5, INK, weight=0.3)
    page.body(54, 518, "Use decorative glyphs with empty alt text. Give icon-only controls an explicit accessible name.",
              850, 14)
    page.footer(7)


def applications(page):
    page.heading("Digital & print", "Build for a comfortable read.", True)
    page.entry(54, 188, "Use one visual focus",
               "Anchor the page to a single photograph or mark. Keep operating copy left aligned with quiet, generous margins.",
               370, True)
    page.entry(510, 188, "Choose tested pairs",
               "Parchment on Obsidian is 15.31:1. Parchment on Verdigris is 5.42:1. "
               "Use the darker gold ink (#76571D) on Parchment for readable gold text.",
               382, True)
    page.entry(54, 341, "Keep controls explicit",
               "Use visible labels, readable errors, clear focus, and short action text. "
               "Retain a text alternative for image-led messages.",
               370, True)
    page.entry(510, 341, "Respect the viewing conditions",
               "Inspect actual theme states at small sizes and zoom. Proof paper contrast, type size, "
               "and crop at the intended print size.",
               382, True)
    page.label(54, 514, "Live theme source   /   assets/scss/_tokens.scss", GOLD)
    page.footer(8, True)


def release(page):
    page.heading("Brand activation", "Show the work of hosting.")
    page.line(54, 906, 141)
    page.entry(54, 198, "Lead with the evening",
               "A friend discovers the offer, sees how the evening works, then learns what to share in a private consultation.",
               397)
    page.entry(511, 198, "Use illustrative examples",
               "Show a labeled Lantern Bay guest introduction or prepared map. Make the preparation visible and leave guest claims to documented evidence.",
               390)
    page.entry(54, 355, "Activate only confirmed details",
               "Use the kit for an exemplar now. A service release needs an owner-confirmed contact route, service scope, and operating terms.",
               397)
    page.entry(511, 355, "Use the working kit",
               "The local kit contains vector masters, mood boards, collateral, voice and campaign guides, and the dated SWOT.",
               390)
    page.label(54, 516, "Working files   /   brand/README.md")
    page.footer(9)


def build_book(output, scratch):
    path = output / "brand-standards.pdf"
    canvas = new_canvas(path, BOOK_SIZE, "Binyled’s Storyscape Brand Standards")
    page = Page(canvas, BOOK_SIZE)
    cover(page)
    position(page)
    identity(page, scratch)
    color_and_type(page)
    mood(page, 5, "prepared-table", "The Prepared Table",
         "A gathering your guests can enter easily, with an attentive host at the table.",
         "Seated eye line, walnut, linen, ordinary glass, warm lamplight.",
         "Homepage, introduction, host one-sheet.", (INK, FOREST, PAPER, GOLD), True)
    mood(page, 6, "world-in-the-details", "World in the Details",
         "A private world made tangible through the materials guests touch and choices they make.",
         "Cream paper, quiet cartography, woven cloth, worn brass.",
         "Preparation stories, adventure previews, invitation details.", (PAPER, GREEN, FOREST, GOLD), False)
    glyphs(page, scratch)
    applications(page)
    release(page)
    canvas.save()
    for number, name in ((5, "prepared-table"), (6, "world-in-the-details")):
        subprocess.run([
            "pdftoppm", "-f", str(number), "-l", str(number), "-r", "120",
            "-png", "-singlefile", str(path), str(output / "mood-boards" / name),
        ], check=True)


def build_one_sheet(output):
    size = (612, 792)
    canvas = new_canvas(output / "host-one-sheet.pdf", size, "The Private Storyscape")
    page = Page(canvas, size)
    page.rect(0, 0, 612, 792, PAPER)
    page.label(42, 43, COPY["brand"])
    page.text(41, 102, "The Private Storyscape", 56, INK, DISPLAY)
    page.body(42, 130, COPY["descriptor"], 525, 17)
    page.image("prepared-table", 42, 152, 528, 240, (0.68, 0.55))
    page.text(41, 437, "You host the people. I host the world.", 33, INK, DISPLAY)
    page.body(42, 465, "Give your guests a shared adventure and take a seat beside them. "
              "I shape the story around your group and guide the evening as it unfolds.", 508, 15)
    for x, title, copy in (
        (42, "Tell me about your table", "Share the occasion, guest mix, and the kind of evening you have in mind."),
        (220, "I prepare the world", "The story and practical details take shape after we discuss fit."),
        (398, "Play alongside your guests", "Guests learn as they go. Their choices guide what happens next."),
    ):
        page.line(x, x + 153, 530)
        y = page.body(x, 554, title, 160, 15, leading=19)
        page.body(x, y + 6, copy, 160, 13)
    page.rect(42, 669, 528, 76, FOREST)
    page.text(58, 694, "Request a private consultation", 17, PAPER, weight=0.32)
    contact = COPY["contact"] or f"{COPY['region']}  •  Details confirmed privately"
    if page.body(58, 719, contact, 480, 12, PAPER) > 753:
        raise ValueError("Contact details exceed the host one-sheet's CTA panel.")
    page.text(42, 766, COPY["preview_note"], 10.5, MUTED)
    canvas.showPage()
    canvas.save()


def build_invitation(output):
    size = (360, 504)
    details = COPY["invitation"]
    canvas = new_canvas(output / "guest-invitation.pdf", size, "A Storyscape Guest Invitation")
    page = Page(canvas, size)
    page.rect(0, 0, 360, 504, PAPER)
    page.image("world-in-the-details", 24, 23, 312, 136, (0.68, 0.45))
    page.label(24, 184, "You’re invited")
    y = page.body(24, 221, details["title"], 312, 29, leading=31, font=DISPLAY)
    y = page.body(24, y + 4, details["opening"], 310, 14)
    y = page.body(24, y + 10, "New to tabletop games? You’ll learn as you go.", 310, 14) + 10
    for label, value in (("When", details["date"]), ("Where", details["place"])):
        page.label(24, y + 6, label)
        y = page.body(99, y + 6, value, 234, 13) + 4
    if page.body(24, y + 10, details["reply"], 310, 13) > 455:
        raise ValueError("Guest invitation copy exceeds the 5 by 7 inch layout.")
    page.line(24, 336, 461)
    page.text(24, 480, details["preview_note"] or COPY["brand"], 10.5, MUTED)
    canvas.showPage()
    canvas.save()


def build_social(output, scratch):
    for name, width, height, image_height, image_name in (
        ("social-link", 1200, 630, 630, "prepared-table"),
        ("social-square", 1080, 1080, 586, "world-in-the-details"),
        ("social-portrait", 1080, 1350, 790, "prepared-table"),
    ):
        horizontal = name == "social-link"
        art = Image.new("RGB", (width, height), INK)
        image_width = 610 if horizontal else width
        art.paste(photo(image_name, (image_width, image_height), (0.78, 0.5)),
                  (width - image_width if horizontal else 0, 0))
        draw = ImageDraw.Draw(art)

        def label(x, y, value, size, color, family, weight):
            font = ImageFont.truetype(str(scratch / f"{family}.ttf"), size)
            font.set_variation_by_axes([weight])
            right = width - image_width if horizontal else width
            if x + draw.textlength(value, font=font) > right - 30:
                raise ValueError(f"Copy too wide for {name}: {value}")
            draw.text((x, y), value, fill=color, font=font, anchor="lt")

        x = 60 if horizontal else 76
        y = 81 if horizontal else image_height + 56
        label(x, y, COPY["brand"], 26 if horizontal else 32, GOLD, BODY, 650)
        draw.line((x, y + 56, x + (431 if horizontal else 920), y + 56), fill=GOLD, width=1)
        for index, line in enumerate(COPY["promise"]):
            label(x, y + 100 + index * (76 if horizontal else 94), line,
                  58 if horizontal else 90, PAPER, DISPLAY, 500)
        label(x, y + (294 if horizontal else 315), COPY["descriptor"],
              25 if horizontal else 34, PAPER, BODY, 550)
        label(x, height - 60, COPY["region"],
              17 if horizontal else 23, GOLD, BODY, 550)
        art.save(output / f"{name}.png", optimize=True)


def main():
    with TemporaryDirectory(prefix=".render-", dir=BRAND) as directory:
        scratch = Path(directory)
        output = scratch / "output"
        collateral = output / "collateral"
        collateral.mkdir(parents=True)
        (output / "mood-boards").mkdir()
        export_fonts(scratch)
        build_book(output, scratch)
        build_one_sheet(collateral)
        build_invitation(collateral)
        build_social(collateral, scratch)
        for file in output.rglob("*"):
            if file.is_file():
                destination = BRAND / file.relative_to(output)
                destination.parent.mkdir(exist_ok=True)
                file.replace(destination)


if __name__ == "__main__":
    main()
