from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICONSET = ROOT / "build" / "icon.iconset"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def render(size: int) -> Image.Image:
    scale = size / 1024
    image = Image.new("RGBA", (size, size), "#07101d")
    draw = ImageDraw.Draw(image)

    def s(value: int) -> int:
        return round(value * scale)

    rounded(draw, (s(96), s(96), s(928), s(928)), s(172), "#111c2e", "#70e8ff", s(28))
    rounded(draw, (s(178), s(224), s(846), s(660)), s(56), "#0d1828", "#2f4662", s(18))

    line = [(s(246), s(514)), (s(354), s(420)), (s(470), s(470)), (s(598), s(318)), (s(778), s(404))]
    draw.line(line, fill="#70e8ff", width=s(34), joint="curve")
    draw.line(line, fill="#19a463", width=max(1, s(12)), joint="curve")

    rounded(draw, (s(258), s(714), s(392), s(798)), s(18), "#19a463")
    rounded(draw, (s(445), s(714), s(579), s(798)), s(18), "#2f6fc7")
    rounded(draw, (s(632), s(714), s(766), s(798)), s(18), "#c7403a")

    label_font = font(s(176))
    text = "AP"
    bbox = draw.textbbox((0, 0), text, font=label_font)
    x = (size - (bbox[2] - bbox[0])) / 2
    y = s(590) - (bbox[3] - bbox[1])
    draw.text((x, y), text, fill="#edf7ff", font=label_font)
    return image


def main() -> None:
    ICONSET.mkdir(parents=True, exist_ok=True)
    specs = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024),
    ]
    for name, size in specs:
        render(size).save(ICONSET / name)


if __name__ == "__main__":
    main()
