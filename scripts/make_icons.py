#!/usr/bin/env python3
"""확장 아이콘 생성: 다크 라운드 사각형 + 치지직 그린 플레이 트라이앵글.

외부 의존성 없이 표준 라이브러리만으로 PNG 를 만든다.
"""
import struct
import zlib
from pathlib import Path

BG = (20, 21, 23)  # #141517
FG = (0, 255, 163)  # #00FFA3
SIZES = [16, 32, 48, 64, 96, 128, 256, 512]
SS = 4  # supersample 배율 (안티앨리어싱)


def write_png(path: Path, size: int, pixels: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(
        b"\x00" + pixels[y * size * 4 : (y + 1) * size * 4] for y in range(size)
    )
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA8
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def sample(x: float, y: float, s: float) -> tuple:
    """(x, y) ∈ [0, s)² 지점의 RGBA. s 는 캔버스 크기."""
    # 라운드 사각형 (모서리 반경 22%)
    r = s * 0.22
    pad = s * 0.02
    cx = min(max(x, pad + r), s - pad - r)
    cy = min(max(y, pad + r), s - pad - r)
    if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
        return (0, 0, 0, 0)

    # 플레이 트라이앵글: 좌변 x0, 꼭짓점 x1, 세로 중앙
    x0, x1 = s * 0.38, s * 0.72
    half_h = s * 0.20  # 좌변에서의 반높이
    if x0 <= x <= x1:
        t = (x - x0) / (x1 - x0)
        if abs(y - s * 0.5) <= half_h * (1 - t):
            return (*FG, 255)
    return (*BG, 255)


def render(size: int) -> bytes:
    s = float(size)
    out = bytearray()
    step = 1.0 / SS
    for py in range(size):
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    c = sample(px + (sx + 0.5) * step, py + (sy + 0.5) * step, s)
                    for i in range(4):
                        acc[i] += c[i]
            n = SS * SS
            out.extend(v // n for v in acc)
    return bytes(out)


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "extension" / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        write_png(out_dir / f"icon-{size}.png", size, render(size))
        print(f"icon-{size}.png")


if __name__ == "__main__":
    main()
