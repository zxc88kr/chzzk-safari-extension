#!/bin/bash
# README 팝업 스크린샷 생성. 설정 항목이나 문구를 바꾼 뒤 이걸 돌리고 커밋한다.
# 사용: ./scripts/screenshot.sh
#
# 왜 이렇게 하는가
# - Safari 확장 팝업은 safari-web-extension://<UUID>/ 아래에 있고 그 UUID 가
#   페이지 쪽에 안 새어나와서, 실제 팝업을 열어 자동으로 찍을 방법이 없다.
# - screencapture 는 터미널에 "화면 기록" 권한이 있어야 하고, 권한을 주려면
#   앱을 재시작해야 한다. 그래서 화면을 찍지 않고 페이지 안에서 PNG 를 굽는다
#   (DOM → SVG foreignObject → canvas → dataURL).
# - README 이미지는 팝업을 2단으로 흘린 배치다. 실제 팝업엔 없는 배치라
#   여기서만 만들고, 실제 팝업 CSS(popup.css)는 건드리지 않는다.
#
# 필요 조건: Safari 개발자 메뉴 → "Apple Events의 JavaScript 허용" 체크.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/popup.png"
WORK="$(mktemp -d -t czse-shot)"
WIN=""

die() { echo "✗ $1" >&2; exit 1; }
cleanup() {
  [ -n "$WIN" ] && osascript -e "tell application \"Safari\" to close (first window whose id is $WIN)" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

command -v osascript >/dev/null || die "macOS 에서만 동작합니다."

# 스크린샷용 단일 HTML 을 만든다. popup.css 를 인라인해야 foreignObject 안에서
# 스타일이 살아남는다 (외부 링크는 SVG 안에서 로드되지 않는다).
python3 - "$ROOT" "$WORK" <<'PY'
import json, pathlib, sys

root, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
html = (root / "extension/popup/popup.html").read_text()
css = (root / "extension/popup/popup.css").read_text()
version = json.loads((root / "extension/manifest.json").read_text())["version"]

# 기본값 그대로 찍으면 토글이 전부 회색이라 기능이 안 보인다.
# 실사용 예시로 켜 두는 항목 — 기존 README 이미지와 같은 조합이다.
SHOWCASE = [
    "latencyDisplay", "arrowSeek", "maxQuality", "autoWide", "autoUnmute",
    "captureButton", "pipButton", "chatTimestamp", "chatMacros",
    "hoverPreview", "sidebarRefresh", "channelChatTab", "staticLogo",
]

poster = """
/* README 스크린샷 전용 2단 배치. 실제 팝업은 328px 한 줄로 쭉 이어지므로
   칸을 나누지 않고 그 흐름을 절반에서 잘라 옆에 붙인다. 그리드로 칸을 나누면
   짧은 섹션 아래에 빈 공간이 생긴다. 구분선도 직접 긋지 않고 column-rule 에 맡긴다. */
body { width: 656px !important; }
#shot-cols { column-count: 2; column-gap: 0; column-rule: 1px solid var(--line); }
/* 단이 넘어갈 때 행이 반토막 나지 않게 한다 */
#shot-cols .row, #shot-cols .sec-head, #shot-cols .macro-add, #shot-cols .keep {
  break-inside: avoid;
}
#shot-cols .sec-head { break-after: avoid; }
"""

shim = """<script>
// 확장 컨텍스트 밖에서 팝업을 그대로 렌더하기 위한 최소 shim.
// 최신 버전을 현재 버전과 같게 줘서 업데이트 배너가 뜨지 않게 한다.
const __store = {%s};
window.browser = {
  runtime: { getManifest: () => ({ version: "%s" }) },
  storage: {
    local: {
      async get(defaults) { return { ...defaults, ...__store }; },
      async set(obj) { Object.assign(__store, obj); },
    },
    onChanged: { addListener() {} },
  },
};
window.fetch = async () => ({ ok: true, json: async () => ({ version: "%s" }) });
</script>
""" % (", ".join('"%s": true' % k for k in SHOWCASE), version, version)

tail = """<script>
// 헤더·푸터는 전폭으로 두고 설정 섹션만 2단으로 흘린다.
(() => {
  const cols = document.createElement("div");
  cols.id = "shot-cols";
  const sections = [...document.querySelectorAll("body > section")];
  sections[0].before(cols);
  sections.forEach((el) => cols.appendChild(el));

  // 섹션 제목이 단 끝에 홀로 남지 않도록 바로 뒤 행과 한 덩어리로 묶는다
  // (break-after:avoid 만으로는 Safari 가 안 지킨다)
  cols.querySelectorAll(".sec-head").forEach((head) => {
    const next = head.nextElementSibling;
    if (!next) return;
    const keep = document.createElement("div");
    keep.className = "keep";
    head.before(keep);
    keep.append(head, next);
  });
})();

// DOM 을 SVG foreignObject 에 넣고 canvas 로 구워 PNG dataURL 을 만든다.
window.__render = function (scale) {
  const clone = document.documentElement.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.querySelectorAll("script").forEach((el) => el.remove());

  // checked/value 는 DOM 프로퍼티라 직렬화하면 날아간다 — 속성으로 옮긴다.
  // 안 하면 토글이 전부 off, 슬라이더가 중간값으로 굳는다.
  const live = document.querySelectorAll("input");
  const copies = clone.querySelectorAll("input");
  live.forEach((el, i) => {
    const c = copies[i];
    if (!c) return;
    if (el.type === "checkbox") {
      if (el.checked) c.setAttribute("checked", "checked");
      else c.removeAttribute("checked");
    } else {
      c.setAttribute("value", el.value);
    }
  });

  const w = document.body.offsetWidth;
  const h = document.body.offsetHeight;
  const xml = new XMLSerializer().serializeToString(clone);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<foreignObject x="0" y="0" width="100%" height="100%">' + xml + "</foreignObject></svg>";

  const img = new Image();
  window.__png = null;
  window.__err = null;
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = w * scale;
      c.height = h * scale;
      const ctx = c.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      window.__png = c.toDataURL("image/png");
    } catch (e) {
      window.__err = String(e);
    }
  };
  img.onerror = () => { window.__err = "SVG 로드 실패"; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return "ok";
};
</script>
"""

def swap(text, anchor, replacement):
    # popup.html 이 바뀌어 앵커가 사라지면 replace 가 조용히 아무것도 안 한다.
    # 그대로 두면 스타일이나 shim 이 빠진 이미지가 만들어져 커밋된다 — 여기서 죽인다.
    if anchor not in text:
        raise SystemExit("popup.html 에서 못 찾음: " + anchor)
    return text.replace(anchor, replacement, 1)


html = swap(html, '<link rel="stylesheet" href="popup.css" />',
            "<style>\n" + css + "\n" + poster + "\n</style>")
html = swap(html, '  <script src="../common/defaults.js"></script>',
            "  " + shim + '  <script src="../common/defaults.js"></script>')
html = swap(html, "</body>", tail + "</body>")

(work / "popup").mkdir(parents=True)
(work / "popup" / "popup.html").write_text(html)
(work / "common").mkdir()
(work / "common" / "defaults.js").write_text((root / "extension/common/defaults.js").read_text())
(work / "popup" / "popup.js").write_text((root / "extension/popup/popup.js").read_text())
PY

VERSION="$(python3 -c "
import json,sys
print(json.load(open('$ROOT/extension/manifest.json'))['version'])")"

js() { osascript -e "tell application \"Safari\" to do JavaScript \"$1\" in current tab of (first window whose id is $WIN)"; }

echo "▶ Safari 에서 렌더 중…"
# front window 로 잡으면 그 사이 다른 창이 앞으로 올 때 엉뚱한 창을 물고,
# cleanup 이 사용자의 창을 닫아버린다. 우리가 연 URL 로 창을 특정한다.
WIN="$(osascript <<EOF
tell application "Safari"
  make new document with properties {URL:"file://$WORK/popup/popup.html"}
  repeat 40 times
    repeat with w in windows
      try
        if (URL of current tab of w) contains "$(basename "$WORK")" then return (id of w as string)
      end try
    end repeat
    delay 0.25
  end repeat
  return "0"
end tell
EOF
)" || die "Safari 를 열지 못했습니다."
[ "$WIN" != "0" ] || { WIN=""; die "스크린샷 창을 찾지 못했습니다."; }

PROBE="$(js "String(typeof window.__render)")" || die \
  "Safari 에서 JavaScript 를 실행하지 못했습니다.
  Safari → 설정 → 고급 → '웹 개발자용 기능 보기' 를 켠 뒤,
  개발 메뉴 → 'Apple Events의 JavaScript 허용' 을 체크하세요."
[ "$PROBE" = "function" ] || die "스크린샷 페이지가 로드되지 않았습니다."

js "window.__render(2)" >/dev/null

# 고정 대기는 느린 기기에서 그대로 실패한다 — 끝날 때까지 짧게 확인한다
for _ in $(seq 1 60); do
  STATE="$(js "window.__err !== null ? 'err' : (window.__png ? 'ok' : 'wait')")"
  [ "$STATE" = "wait" ] || break
  sleep 0.25
done
[ "$STATE" != "err" ] || die "렌더 실패: $(js "String(window.__err)")"
[ "$STATE" = "ok" ] || die "렌더가 끝나지 않았습니다 (15초 초과)."

LEN="$(js "String(window.__png.length)")"
[ "$LEN" -gt 0 ] 2>/dev/null || die "PNG 를 만들지 못했습니다."

# dataURL 이 수십만 자라 osascript 반환값으로 한 번에 못 받는다 — 잘라서 이어붙인다.
: > "$WORK/png.b64"
i=0
while [ "$i" -lt "$LEN" ]; do
  js "window.__png.substr($i,60000)" >> "$WORK/png.b64"
  i=$((i + 60000))
done

python3 - "$WORK/png.b64" "$OUT" <<'PY'
import base64, pathlib, sys
data = pathlib.Path(sys.argv[1]).read_text().replace("\n", "").replace("\r", "")
prefix = "data:image/png;base64,"
if not data.startswith(prefix):
    raise SystemExit("✗ dataURL 형식이 아닙니다: " + data[:40])
pathlib.Path(sys.argv[2]).write_bytes(base64.b64decode(data[len(prefix):]))
PY

# 캐시 키를 안 올리면 기존 방문자에게 옛 이미지가 그대로 보인다.
python3 - "$ROOT/README.md" "$VERSION" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
new = re.sub(r"(\./assets/popup\.png\?v=)[0-9.]+", r"\g<1>" + sys.argv[2], s, count=1)
if new != s:
    p.write_text(new)
    print("  README 캐시 키 → " + sys.argv[2])
PY

W="$(sips -g pixelWidth "$OUT" | awk '/pixelWidth/{print $2}')"
H="$(sips -g pixelHeight "$OUT" | awk '/pixelHeight/{print $2}')"
[ "$W" = "1312" ] || die "폭이 1312 가 아닙니다($W) — 레이아웃이 깨졌을 수 있습니다."
echo "✓ $OUT  (${W}x${H}px, v$VERSION)"
