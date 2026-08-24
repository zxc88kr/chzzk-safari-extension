#!/bin/bash
# 서명 빌드 → ~/Applications 설치. 코드 수정 후 이 스크립트만 실행하면 된다.
# 사용: ./scripts/build.sh
#
# 팀 ID 는 키체인의 Apple 개발 인증서에서 자동으로 찾는다.
# (CZSE_TEAM_ID 환경변수로 덮어쓸 수 있다)
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../app/Chzzk Safari Extension" && pwd)"
PROJECT="$PROJECT_DIR/Chzzk Safari Extension.xcodeproj"
SCHEME="Chzzk Safari Extension"
APP_NAME="Chzzk Safari Extension.app"
DEST="$HOME/Applications/$APP_NAME"
DERIVED="$PROJECT_DIR/build"

# 개발 인증서 subject 의 OU 가 팀 ID
TEAM_ID="${CZSE_TEAM_ID:-$(security find-certificate -a -c "Apple Development" -p 2>/dev/null |
  openssl x509 -noout -subject 2>/dev/null |
  tr ',' '\n' | sed -n 's/.*OU=\([A-Z0-9]*\).*/\1/p' | head -1 || true)}"

if [ -z "$TEAM_ID" ]; then
  echo "✗ Apple 개발 인증서를 찾을 수 없습니다." >&2
  echo "  Xcode → Settings(⌘,) → Accounts → '+' 로 Apple ID 를 추가하면 무료로 발급됩니다." >&2
  exit 1
fi

echo "▶ 빌드 중… (팀 $TEAM_ID)"
# 성공하면 조용히, 실패하면 로그를 보여준다 (xcodebuild 는 무해한 경고를 많이 낸다)
BUILD_LOG="$(mktemp -t czse-build)"
trap 'rm -f "$BUILD_LOG"' EXIT
if ! xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -derivedDataPath "$DERIVED" \
  DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build >"$BUILD_LOG" 2>&1; then
  echo "✗ 빌드 실패" >&2
  # 에러 줄을 우선 보여주고, 없으면 마지막 로그로 대체
  if grep -qE "error:|Signing for|requires a development team" "$BUILD_LOG"; then
    grep -E "error:|Signing for|requires a development team" "$BUILD_LOG" | head -10 | sed 's/^/  /' >&2
  else
    tail -20 "$BUILD_LOG" | sed 's/^/  /' >&2
  fi
  echo "  (전체 로그: $BUILD_LOG)" >&2
  trap - EXIT # 디버깅용으로 로그 남김
  exit 1
fi

BUILT="$DERIVED/Build/Products/Debug/$APP_NAME"
if [ ! -d "$BUILT" ]; then
  echo "✗ 빌드 산물을 찾을 수 없습니다: $BUILT" >&2
  exit 1
fi

echo "▶ 설치 중…"
osascript -e 'quit app "Chzzk Safari Extension"' 2>/dev/null || true
sleep 1
rm -rf "$DEST"
mkdir -p "$HOME/Applications"
ditto "$BUILT" "$DEST"

# 빌드 캐시 정리 (중복 등록 방지)
rm -rf "$DERIVED"

# 설치본 서명 확인 (개발 인증서여야 storage 가 영구 유지된다)
SIGN_AUTH="$(codesign -dvvv "$DEST" 2>&1 | grep "^Authority=" | head -1)"
if echo "$SIGN_AUTH" | grep -q "Apple Development"; then
  echo "  서명 ✓ ${SIGN_AUTH#Authority=}"
else
  echo "⚠ 개발 인증서로 서명되지 않았습니다 (${SIGN_AUTH#Authority=}). Xcode 서명 설정을 확인하세요." >&2
fi

open "$DEST"
echo "✓ 완료 → $DEST"
echo "  Safari 확장을 껐다 켜거나 페이지를 새로고침하면 반영됩니다."
