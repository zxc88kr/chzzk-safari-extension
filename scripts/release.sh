#!/bin/bash
# 태그 + GitHub 릴리스를 한 번에 찍는다. 버전업·커밋·푸시를 끝낸 뒤 실행한다.
# 사용: ./scripts/release.sh [-n 노트파일]
#
# 버전은 extension/manifest.json 에서 읽는다 (태그는 v<version>).
# -n 을 안 주면 $EDITOR 로 템플릿을 열어 릴리스 노트를 받는다.
#
# 태그는 있는데 릴리스만 빠진 경우(2.2.0/2.2.1 때 그랬다)에도
# 그대로 실행하면 릴리스만 만들어 준다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NOTES_FILE=""
while getopts ":n:" opt; do
  case "$opt" in
    n) NOTES_FILE="$OPTARG" ;;
    *) echo "사용: ./scripts/release.sh [-n 노트파일]" >&2; exit 1 ;;
  esac
done

die() { echo "✗ $1" >&2; exit 1; }

command -v gh >/dev/null || die "gh(GitHub CLI)가 필요합니다: brew install gh"
gh auth status >/dev/null 2>&1 || die "gh 로그인이 필요합니다: gh auth login"

VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9.]*\)".*/\1/p' extension/manifest.json | head -1)"
[ -n "$VERSION" ] || die "manifest.json 에서 version 을 읽지 못했습니다."
echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || die "version 형식이 이상합니다: $VERSION"
TAG="v$VERSION"

if gh release view "$TAG" >/dev/null 2>&1; then
  die "$TAG 릴리스가 이미 있습니다. 먼저 manifest.json 의 version 을 올리세요."
fi

[ -z "$(git status --porcelain)" ] || die "커밋되지 않은 변경이 있습니다. 커밋 후 다시 실행하세요."

echo "▶ 테스트"
node --test tests/*.test.js >/dev/null || die "테스트 실패. 고치고 다시 실행하세요."

# 팝업 업데이트 배너는 태그가 아니라 main 의 manifest version 을 본다.
# 그래서 릴리스 전에 이 커밋이 origin/main 에 올라가 있어야 한다.
git fetch --quiet origin
HEAD_SHA="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$HEAD_SHA" origin/main 2>/dev/null ||
  die "현재 커밋이 origin/main 에 없습니다. main 에 푸시한 뒤 다시 실행하세요."

REMOTE_VERSION="$(git show origin/main:extension/manifest.json |
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9.]*\)".*/\1/p' | head -1)"
[ "$REMOTE_VERSION" = "$VERSION" ] ||
  die "origin/main 의 version 은 $REMOTE_VERSION 입니다 (로컬 $VERSION). 버전업 커밋을 푸시하세요."

# 노트 준비: -n 없으면 커밋 제목으로 템플릿을 만들어 에디터로 연다.
TMP_NOTES=""
if [ -z "$NOTES_FILE" ]; then
  [ -t 0 ] || die "대화형 실행이 아닙니다. -n 으로 노트 파일을 지정하세요."
  TMP_NOTES="$(mktemp -t czse-notes)"
  mv "$TMP_NOTES" "$TMP_NOTES.md"
  TMP_NOTES="$TMP_NOTES.md"
  trap 'rm -f "$TMP_NOTES"' EXIT
  SUBJECT="$(git log -1 --format=%s)"
  cat > "$TMP_NOTES" <<NOTES
${SUBJECT#*— }

### 변경 사항

-

### 설치 및 업데이트

\`\`\`sh
curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
\`\`\`

설치 후 Safari 확장을 껐다 켜거나 페이지를 새로고침하면 반영됩니다.
NOTES
  "${EDITOR:-vi}" "$TMP_NOTES"
  NOTES_FILE="$TMP_NOTES"
fi

[ -f "$NOTES_FILE" ] || die "노트 파일이 없습니다: $NOTES_FILE"
grep -qE '^-[[:space:]]+\S' "$NOTES_FILE" || die "릴리스 노트의 '변경 사항'이 비어 있습니다."

# 태그가 없으면 만들고, 있으면 가리키는 커밋이 맞는지만 확인한다.
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  [ "$(git rev-parse "$TAG^{commit}")" = "$HEAD_SHA" ] ||
    die "$TAG 태그가 다른 커밋을 가리킵니다."
else
  git tag "$TAG"
  echo "✓ 태그 $TAG 생성"
fi
git push --quiet origin "refs/tags/$TAG"

gh release create "$TAG" --title "$TAG" --notes-file "$NOTES_FILE" --latest
echo "✓ $TAG 릴리스 완료"
