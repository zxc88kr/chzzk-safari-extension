# chzzk-safari-extension

치지직(CHZZK) 시청 편의 기능을 담은 개인용 Safari 확장.

크롬용 확장([chzzk-plus](https://github.com/kyechan99/chzzk-plus), [cheese-knife](https://github.com/jebibot/cheese-knife))을 Safari에서 쓸 수 없어, 필요한 기능만 골라 Safari Web Extension으로 다시 구현했다.

## 기능

전부 확장 팝업에서 개별 토글할 수 있다.

**플레이어**
- 지연시간 표시 — 칩 클릭 시 1.5배속으로 따라잡기, ⇧클릭 시 라이브 지점으로 이동
- 방향키(←/→) 라이브 되감기·따라가기
- 자동 넓은 화면 / 자동 음소거 해제
- 통나무 자동 획득
- PIP·화면 캡처 버튼

**채팅**
- 타임스탬프 (유저 채팅에만, 시스템 공지 자동 숨김)
- 자주 쓰는 문구 — 채팅창 버튼으로 저장한 문구 바로 입력

**탐색**
- 방송 링크 호버 미리보기 (크기·지연·볼륨 조절, Safari 네이티브 HLS)
- 사이드바 팔로잉 목록 30초 자동 갱신
- 방송 시작 시 자동 새로고침·이동 / 채널 홈 채팅 탭

**화면 정리**
- 정적 로고, 차단 방송·오프라인 채널 숨기기
- 사이드바 추천·파트너 / 인기 카테고리 / 방송 일정 / 치즈팜 광고 숨기기

## 구조

```
extension/   웹 확장 소스 (manifest v3, content scripts, popup)
app/         safari-web-extension-converter 로 생성한 Xcode 래퍼
```

치지직은 css-module 해시 클래스를 쓰므로 클래스명 하드코딩을 피하고, 텍스트·구조 기반 태깅과 `data-czse-*` 속성으로 DOM을 다룬다. 사이드바 갱신은 팔로잉 라이브 API를 직접 폴링한다.

## 빌드 / 설치

개발 중에는 서명 없이 임시 로드하는 쪽이 빠르다.

**임시 로드 (개발용)**
1. Safari → 설정 → 고급 → "웹 개발자용 기능 보기" 체크
2. 개발자 탭 → "허용되지 않은 확장 프로그램 허용" 체크
3. "임시 확장 프로그램 추가..." → `extension/` 폴더 선택
4. 소스 수정 후에는 확장 "다시 로드" + 페이지 새로고침

> 임시 로드한 확장은 다시 로드할 때마다 저장소가 초기화된다. 영구 설치는 아래 서명 빌드로.

**서명 빌드 (영구 설치)**
```sh
open "app/Chzzk Safari Extension/Chzzk Safari Extension.xcodeproj"
```
1. Xcode → Signing & Capabilities 에서 본인 Apple ID(Personal Team) 선택
2. ⌘R 로 빌드·실행 → Safari 확장 목록에서 활성화
3. chzzk.naver.com 권한 허용

자동 음소거 해제 등 일부 기능은 Safari → 설정 → 웹 사이트 → 자동 재생에서 chzzk.naver.com을 "모든 자동 재생 허용"으로 둬야 제대로 동작한다.

## Credits

Safari로 옮겨오며 아래 두 크롬 확장의 기능과 접근 방식을 참고했다.

- [**chzzk-plus**](https://github.com/kyechan99/chzzk-plus) — kyechan99
- [**cheese-knife**](https://github.com/jebibot/cheese-knife) — jebibot

## License

MIT © [zxc88kr](https://github.com/zxc88kr)
