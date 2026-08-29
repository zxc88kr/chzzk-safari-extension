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
warn() { printf '\033[1;33m⚠\033[0m %s\n' "$1" >&2; }
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
XCODE_ERR="$(mktemp -t czse-xcode)"
trap 'rm -f "$XCODE_ERR"' EXIT

# CLT 만 깔린 경우 xcodebuild 는 스텁이라 실패한다 — 실제 실행으로 판별.
XCODE_VER=""
xcode_ready() {
  XCODE_VER="$(xcodebuild -version 2>"$XCODE_ERR")" || return 1
  XCODE_VER="${XCODE_VER%%$'\n'*}"
  [ -n "$XCODE_VER" ]
}

# Xcode 가 설치돼 있는지는 따로 본다. 있는데도 xcodebuild 가 실패하는 것은 대개
# 첫 실행 뒤 구성요소 설치가 백그라운드로 이어지는 중이라 몇 분이면 저절로 풀린다.
# (그동안 사용자가 같은 명령을 되풀이하게 두지 않고 여기서 기다린다)
XCODE_APP=0
[ -d "${CZSE_XCODE_APP:-/Applications/Xcode.app}" ] && XCODE_APP=1
case "$(xcode-select -p 2>/dev/null)" in *Xcode.app*) XCODE_APP=1 ;; esac

if ! xcode_ready && [ "$XCODE_APP" = 1 ]; then
  say "Xcode 초기 설정이 끝나기를 기다리는 중… (최대 3분, 그대로 두세요)"
  WAITED=0
  while [ "$WAITED" -lt 180 ]; do
    sleep 10
    WAITED=$((WAITED + 10))
    if xcode_ready; then break; fi
  done
fi

if [ -z "$XCODE_VER" ]; then
  # 원인이 라이선스인지 경로인지는 xcodebuild 가 낸 말에 들어 있다 — 감추지 않는다.
  if [ -s "$XCODE_ERR" ]; then
    printf '\n  Xcode 가 낸 오류:\n' >&2
    sed -n '1,3p' "$XCODE_ERR" | sed 's/^/    /' >&2
    printf '\n' >&2
  fi

  if [ "$XCODE_APP" = 1 ]; then
    die "Xcode 초기 설정이 아직 끝나지 않은 것 같습니다." \
      "" \
      "Xcode 를 한 번 실행해 '추가 구성요소 설치'와 라이선스 동의를 끝낸 뒤," \
      "잠시 기다렸다 이 명령을 다시 실행하세요." \
      "" \
      "그래도 같은 메시지가 나오면 아래 두 줄을 차례로 실행하세요." \
      "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" \
      "  sudo xcodebuild -license accept"
  fi

  die "Xcode 가 설치돼 있지 않습니다." \
    "(명령어 도구(Command Line Tools)만으로는 빌드할 수 없습니다)" \
    "" \
    "  1) App Store 에서 'Xcode' 설치 (다운로드만 7GB 이상, 시간이 꽤 걸립니다)" \
    "  2) Xcode 를 한 번 실행해 구성요소 설치·라이선스 동의까지 완료" \
    "  3) 이 명령을 다시 실행"
fi

# 프로젝트 포맷(objectVersion 77)이 Xcode 16 이상만 지원한다
XCODE_MAJOR="$(echo "$XCODE_VER" | sed -n 's/^Xcode \([0-9]*\).*/\1/p')"
if [ -n "$XCODE_MAJOR" ] && [ "$XCODE_MAJOR" -lt 16 ] 2>/dev/null; then
  die "Xcode 16 이상이 필요합니다. (현재 $XCODE_VER)" \
    "" \
    "App Store 에서 Xcode 를 최신 버전으로 업데이트한 뒤 다시 실행하세요."
fi

# ── 2. 소스 준비 ────────────────────────────────────────────
# 인증서가 없을 때 이 소스의 프로젝트를 Xcode 로 열어 발급을 돕기 위해,
# 인증서 확인보다 먼저 소스를 받아 둔다.
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [ -n "$SELF_DIR" ] && [ -d "$SELF_DIR/app" ] && [ -d "$SELF_DIR/extension" ]; then
  SRC_DIR="$SELF_DIR"
  say "소스: $SRC_DIR (현재 저장소)"
elif [ -d "$SRC_DIR/.git" ]; then
  say "소스 업데이트 중…"
  # 2.0.0 때 히스토리를 squash 로 갈아엎어서, 그 이전에 받아 둔 사본은 origin/main 과
  # 조상을 공유하지 않는다 → ff 가 영원히 실패하고 옛 소스로 계속 빌드된다.
  # 사용자 사본은 읽기 전용이므로 실패하면 원격 기준으로 맞춰 버린다.
  if ! git -C "$SRC_DIR" pull --ff-only --quiet 2>/dev/null &&
     ! { git -C "$SRC_DIR" fetch --quiet origin main &&
         git -C "$SRC_DIR" reset --hard --quiet FETCH_HEAD; }; then
    warn "업데이트 실패 — 기존 소스로 진행합니다."
  fi
else
  say "소스 내려받는 중…"
  # git 은 Xcode 에 동봉돼 위에서 이미 보장된다. 실패는 사실상 네트워크 문제.
  git clone --depth 1 --quiet "$REPO" "$SRC_DIR" ||
    die "소스를 내려받지 못했습니다." "인터넷 연결을 확인하고 다시 실행하세요."
fi

# ── 3. 팀 ID 확인 ───────────────────────────────────────────
say "Apple ID 확인…"
# 개발 인증서 subject 의 OU 가 팀 ID.
TEAM_ID="$(security find-certificate -a -c "Apple Development" -p 2>/dev/null |
  openssl x509 -noout -subject 2>/dev/null |
  tr ',' '\n' | sed -n 's/.*OU=\([A-Z0-9]*\).*/\1/p' | head -1 || true)"

# 인증서는 Apple ID 를 추가만 해서는 생기지 않고, 실제로 한 번 서명할 때 발급된다.
# 다만 Apple ID 로그인만 해도 팀 ID 는 Xcode 설정에 남으므로, 인증서가 없을 땐
# 거기서 팀 ID 를 읽어 그대로 빌드를 시도한다 — build.sh 의
# -allowProvisioningUpdates 가 첫 인증서까지 발급해 주면 GUI 단계가 통째로 없어진다.
CERT_MISSING=0
if [ -z "$TEAM_ID" ]; then
  CERT_MISSING=1
  TEAM_ID="$(defaults read com.apple.dt.Xcode 2>/dev/null |
    sed -n 's/.*teamID = "\{0,1\}\([A-Z0-9]\{10\}\)"\{0,1\};.*/\1/p' | head -1 || true)"
fi

# 인증서·팀 ID 둘 다 없으면 Apple ID 자체가 없는 것이다. 로그인만 안내하고 끝낸다.
if [ -z "$TEAM_ID" ]; then
  die "Xcode 에 Apple ID 가 추가돼 있지 않습니다." \
    "" \
    "Xcode → Settings(⌘,) → Accounts → '+' → Apple ID 로 로그인하세요." \
    "(평소 쓰는 애플 계정이면 되고, 유료 등록은 필요 없습니다)" \
    "" \
    "추가한 뒤 이 명령을 다시 실행하면 됩니다."
fi

# ── 4. 빌드 + 설치 ──────────────────────────────────────────
# 완료·안내는 아래에서 전담하므로 build.sh 는 조용히 실행한다.
[ "$CERT_MISSING" = 1 ] && say "개발 인증서가 없어 발급을 함께 시도합니다…"
if ! CZSE_TEAM_ID="$TEAM_ID" CZSE_OPEN_PREFS=1 CZSE_QUIET=1 bash "$SRC_DIR/scripts/build.sh"; then
  # 인증서가 없던 경우엔 자동 발급이 실패한 것일 수 있다 — Xcode 로 한 번 서명하는
  # 길을 안내한다. (프로젝트를 열어 주므로 "아무 프로젝트나"를 찾을 필요가 없다)
  if [ "$CERT_MISSING" = 1 ]; then
    PROJ="$SRC_DIR/app/Chzzk Safari Extension/Chzzk Safari Extension.xcodeproj"
    open "$PROJ" 2>/dev/null || true
    cat >&2 <<'EOF'

  인증서 자동 발급이 안 돼, Xcode 에서 한 번만 직접 서명해야 합니다.
  방금 이 확장 프로젝트를 Xcode 로 열었습니다. (창이 뜨는 데 잠깐 걸릴 수 있어요)

    1) 왼쪽 맨 위 파란 프로젝트 아이콘 → 가운데 TARGETS → Signing & Capabilities
       → Team 에서 본인 이름(Personal Team) 선택
    2) 창 왼쪽 위의  ▶ (재생) 버튼  을 한 번 누르세요  (또는 ⌘R)
       · "서명을 허용하시겠습니까?" 창이 뜨면  [허용]
       · 키체인 접근을 물으면  [항상 허용]
       · 키체인 암호를 물으면  맥 로그인 암호  입력 (화면에 안 보여도 정상)
       · 첫 빌드는 수 분 걸립니다. 작은 앱 창이 뜨면 성공이에요.

  여기까지는 인증서를 만드는 과정이라 확장은 아직 설치되지 않았습니다.
  터미널로 돌아와 이 설치 명령을 한 번만 더 실행하면 끝납니다.

    curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
EOF
  fi
  exit 1
fi

# ── 5. 마무리 안내 ──────────────────────────────────────────
cat <<'EOF'

  ✓ 설치 완료  (~/Applications)

Safari 확장 설정에서 "Chzzk Safari Extension" 을 켜면 끝입니다.
(설치 직후에는 설정 창이 자동으로 열립니다)

  · 창이 없으면  Safari → 설정(⌘,) → 확장 프로그램  에서 켜기
  · 처음 켤 때 권한을 물으면  "chzzk.naver.com 에서 항상 허용"
  · 라운지 글까지 숨기려면  "game.naver.com" 도 허용 (안 해도 나머지는 정상)
  · 기능은 주소창 옆 확장 아이콘에서 켜고 끌 수 있어요

EOF
