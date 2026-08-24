#!/bin/bash
# 원클릭 설치: 사전 조건 확인 → 소스 내려받기 → 빌드 → 설치 → Safari 안내.
#
# 사용:
#   curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
#
# curl | bash 로 실행되므로 stdin 을 쓸 수 없다 — 프롬프트 없이 안내만 하고 종료한다.
set -euo pipefail

REPO="https://github.com/zxc88kr/chzzk-safari-extension.git"
SRC_DIR="${CZSE_SRC_DIR:-$HOME/.chzzk-safari-extension}"

say() { printf '\033[1;32m▶\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$1" >&2; }
die() {
  printf '\033[1;31m✗\033[0m %s\n' "$1" >&2
  [ $# -gt 1 ] && printf '  %s\n' "${@:2}" >&2
  exit 1
}

# ── 1. 사전 조건 ────────────────────────────────────────────
[ "$(uname -s)" = "Darwin" ] || die "macOS 에서만 설치할 수 있습니다."

say "Xcode 확인…"
# CLT 만 깔린 경우 xcodebuild 는 스텁이라 실패한다 — 실제 실행으로 판별
if ! xcodebuild -version >/dev/null 2>&1; then
  die "Xcode 가 필요합니다." \
    "" \
    "Safari 확장은 앱으로 포장해 서명해야 하고, 무료 Apple ID 로 서명하려면 Xcode 가 있어야 합니다." \
    "(명령어 도구만으로는 안 되며, App Store 에서 Xcode 를 설치해야 합니다)" \
    "" \
    "  1) App Store 에서 'Xcode' 설치 (약 4GB, 시간이 꽤 걸립니다)" \
    "  2) Xcode 를 한 번 실행해 초기 설정 완료" \
    "  3) Xcode → Settings(⌘,) → Accounts → '+' → Apple ID 로그인" \
    "  4) 이 명령을 다시 실행"
fi

say "Apple ID 팀 감지…"
# 개발 인증서 subject 의 OU 가 팀 ID. Xcode 에 Apple ID 를 추가하면 자동 발급된다.
TEAM_ID="$(security find-certificate -a -c "Apple Development" -p 2>/dev/null |
  openssl x509 -noout -subject 2>/dev/null |
  tr ',' '\n' | sed -n 's/.*OU=\([A-Z0-9]*\).*/\1/p' | head -1 || true)"

if [ -z "$TEAM_ID" ]; then
  die "Apple 개발 인증서를 찾을 수 없습니다." \
    "" \
    "Xcode 에 Apple ID 를 추가하면 무료로 자동 발급됩니다 (유료 등록 불필요):" \
    "  Xcode → Settings(⌘,) → Accounts → '+' → Apple ID 로그인" \
    "" \
    "추가한 뒤 이 명령을 다시 실행하세요."
fi
say "  팀 ID: $TEAM_ID"

# ── 2. 소스 준비 ────────────────────────────────────────────
# 저장소 안에서 실행했으면 그대로 쓰고, 아니면 받아온다.
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [ -n "$SELF_DIR" ] && [ -d "$SELF_DIR/app" ] && [ -d "$SELF_DIR/extension" ]; then
  SRC_DIR="$SELF_DIR"
  say "소스: $SRC_DIR (현재 저장소)"
elif [ -d "$SRC_DIR/.git" ]; then
  say "소스 업데이트…"
  git -C "$SRC_DIR" pull --ff-only --quiet || warn "업데이트 실패 — 기존 소스로 진행합니다."
else
  command -v git >/dev/null 2>&1 || die "git 이 필요합니다. 'xcode-select --install' 후 다시 시도하세요."
  say "소스 내려받는 중…"
  git clone --depth 1 --quiet "$REPO" "$SRC_DIR"
fi

# ── 3. 빌드 + 설치 ──────────────────────────────────────────
CZSE_TEAM_ID="$TEAM_ID" bash "$SRC_DIR/scripts/build.sh"

# ── 4. 마무리 안내 ──────────────────────────────────────────
cat <<'EOF'

──────────────────────────────────────────────
마지막 한 단계만 남았습니다.

방금 열린 앱 창에서 "Quit and Open Safari Extensions Preferences…"
버튼을 누르거나, 직접 여시려면:

  Safari → 설정(⌘,) → 확장 프로그램 탭
  → "Chzzk Safari Extension" 체크
  → chzzk.naver.com 권한 "허용"

설정은 확장 아이콘(주소창 옆)을 눌러 언제든 바꿀 수 있습니다.
──────────────────────────────────────────────
EOF
