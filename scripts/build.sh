#!/bin/bash
# 서명 빌드 → ~/Applications 설치. 코드 수정 후 이 스크립트만 실행하면 된다.
# 사용: ./scripts/build.sh
set -euo pipefail

TEAM_ID="Y9XXM8XCWH"
PROJECT_DIR="$(cd "$(dirname "$0")/../app/Chzzk Safari Extension" && pwd)"
PROJECT="$PROJECT_DIR/Chzzk Safari Extension.xcodeproj"
SCHEME="Chzzk Safari Extension"
APP_NAME="Chzzk Safari Extension.app"
DEST="$HOME/Applications/$APP_NAME"
DERIVED="$PROJECT_DIR/build"

echo "▶ 빌드 중…"
xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -derivedDataPath "$DERIVED" \
  DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build >/dev/null

BUILT="$DERIVED/Build/Products/Debug/$APP_NAME"
if [ ! -d "$BUILT" ]; then
  echo "✗ 빌드 산물을 찾을 수 없습니다: $BUILT" >&2
  exit 1
fi

echo "▶ 설치 중…"
osascript -e 'quit app "Chzzk Safari Extension"' 2>/dev/null || true
sleep 1
rm -rf "$DEST"
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
