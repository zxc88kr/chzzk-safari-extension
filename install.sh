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

# ── 안내 ────────────────────────────────────────────────────
printf '\n\033[1mChzzk Safari Extension 설치\033[0m\n'
printf '치지직 시청 편의 확장을 이 맥에서 빌드해 설치합니다.\n\n'

# ── 1. 사전 조건 ────────────────────────────────────────────
[ "$(uname -s)" = "Darwin" ] || die "macOS 에서만 설치할 수 있습니다."

# 빌드에 Xcode 16 이상이 필요하고(프로젝트 포맷 objectVersion 77),
# Xcode 16 은 macOS 14.5 이상에서만 설치된다.
OS_VER="$(sw_vers -productVersion)"
OS_MAJOR="${OS_VER%%.*}"
OS_MINOR="$(echo "$OS_VER" | cut -d. -f2)"
if [ "$OS_MAJOR" -lt 14 ] 2>/dev/null ||
  { [ "$OS_MAJOR" -eq 14 ] && [ "${OS_MINOR:-0}" -lt 5 ] 2>/dev/null; }; then
  die "macOS 14.5 이상이 필요합니다. (현재 $OS_VER)" \
    "" \
    "빌드에 Xcode 16 이상이 필요한데, 그 버전은 macOS 14.5 부터 설치됩니다."
fi

say "Xcode 확인…"
# CLT 만 깔린 경우 xcodebuild 는 스텁이라 실패한다 — 실제 실행으로 판별
if ! XCODE_VER="$(xcodebuild -version 2>/dev/null | head -1)"; then
  die "Xcode 를 찾지 못했습니다." \
    "(설치돼 있다면 초기 설정이 끝나지 않았거나, 명령어 도구를 보고 있는 상태입니다)" \
    "" \
    "  1) App Store 에서 'Xcode' 설치 (약 4GB, 시간이 꽤 걸립니다)" \
    "  2) Xcode 를 한 번 실행해 초기 설정 완료" \
    "  3) Xcode → Settings(⌘,) → Accounts → '+' → Apple ID 로그인" \
    "  4) 이 명령을 다시 실행" \
    "" \
    "이미 설치했는데도 이 메시지가 나오면 아래 두 줄을 차례로 실행하세요." \
    "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" \
    "  sudo xcodebuild -license accept"
fi

# 프로젝트 포맷(objectVersion 77)이 Xcode 16 이상만 지원한다
XCODE_MAJOR="$(echo "$XCODE_VER" | sed -n 's/^Xcode \([0-9]*\).*/\1/p')"
if [ -n "$XCODE_MAJOR" ] && [ "$XCODE_MAJOR" -lt 16 ] 2>/dev/null; then
  die "Xcode 16 이상이 필요합니다. (현재 $XCODE_VER)" \
    "" \
    "App Store 에서 Xcode 를 최신 버전으로 업데이트한 뒤 다시 실행하세요."
fi

say "Apple ID 확인…"
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
# 완료·안내는 아래에서 전담하므로 build.sh 는 조용히 실행한다.
CZSE_TEAM_ID="$TEAM_ID" CZSE_OPEN_PREFS=1 CZSE_QUIET=1 bash "$SRC_DIR/scripts/build.sh"

# ── 4. 마무리 안내 ──────────────────────────────────────────
cat <<'EOF'

  ✓ 설치 완료  (~/Applications)

이제 Safari 에서 켜기만 하면 됩니다.
방금 열린 Safari 확장 설정 창에서

  1. "Chzzk Safari Extension" 체크
  2. 권한을 물으면 "chzzk.naver.com 에서 항상 허용"

창이 안 보이면  Safari → 설정(⌘,) → 확장 프로그램  에서 직접 켜세요.
기능은 주소창 옆 확장 아이콘에서 켜고 끌 수 있습니다.

EOF
