# chzzk-safari-extension

치지직 시청 편의 기능을 담은 개인용 Safari 확장.

## 기능

- 지연시간 표시 + 따라잡기 (칩 클릭: 1.5배속, ⇧클릭: 라이브 지점 이동)
- 방향키(←/→) 라이브 탐색
- 채팅 타임스탬프
- 방송 링크 호버 미리보기 (Safari 네이티브 HLS)
- 사이드바 팔로잉 목록 30초 자동 갱신
- 오프라인 채널 방송 시작 시 자동 새로고침

## 빌드

```sh
open app/Chzzk\ Safari\ Extension/Chzzk\ Safari\ Extension.xcodeproj
```

1. Xcode → Signing & Capabilities 에서 Personal Team 선택
2. ⌘R 로 빌드·실행
3. Safari → 설정 → 확장 프로그램에서 활성화, chzzk.naver.com 권한 허용

웹 확장 소스는 `extension/`, Xcode 래퍼는 `app/`. 소스 수정 후 다시 ⌘R.

## 참고

기능 아이디어와 치지직 DOM/API 접근 방식은 [chzzk-plus](https://github.com/kyechan99/chzzk-plus)와 [cheese-knife](https://github.com/jebibot/cheese-knife)(둘 다 MIT)를 참고했다. 사이드바 갱신의 React effect 재실행 기법은 cheese-knife의 접근을 따랐다.

MIT License.
