<p align="center">
  <img src="./extension/icons/icon-128.png" width="88" alt="로고" />
</p>
<h1 align="center">Chzzk Safari Extension</h1>
<p align="center">치지직 시청 편의 기능을 담은 개인용 Safari 확장</p>
<p align="center">
  <img src="https://img.shields.io/github/v/tag/zxc88kr/chzzk-safari-extension?style=flat-square&label=version&color=00FFA3" alt="Version" />
  <img src="https://img.shields.io/badge/Safari-Web%20Extension-1B88CA?style=flat-square&logo=safari&logoColor=white" alt="Safari Web Extension" />
  <img src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/github/license/zxc88kr/chzzk-safari-extension?style=flat-square" alt="License" />
</p>

크롬용 확장은 많지만 Safari에서는 쓸 수 없어서, 자주 쓰던 기능만 골라 Safari Web Extension으로 다시 만들었습니다. 모든 기능은 확장 팝업에서 하나씩 켜고 끌 수 있습니다.

## 기능

**플레이어**

- **지연시간 표시** — 클릭하면 1.5배속으로 따라잡고, ⇧클릭하면 라이브 지점으로 이동
- **방향키 탐색** — ←/→ 로 라이브 되감기·따라가기
- **자동 넓은 화면 / 음소거 해제** — 라이브 진입 시 자동 적용
- **통나무 자동 획득** — 시청 중 쌓이는 통나무 자동 수령
- **PIP · 화면 캡처** — 화면 속 화면으로 띄우기, 현재 장면 이미지 저장

**채팅**

- **타임스탬프** — 새 채팅에 받은 시각 표시 (시스템 공지 자동 숨김)
- **자주 쓰는 문구** — 저장한 문구를 버튼으로 바로 입력

**탐색**

- **호버 미리보기** — 방송 링크에서 화면 미리보기 (크기·지연·볼륨 조절)
- **사이드바 자동 갱신** — 30초마다 팔로잉 목록 새로고침
- **방송 시작 자동 새로고침** — 기다리던 채널이 켜지면 자동으로 열기
- **채널 채팅 탭** — 오프라인 채널에서도 채팅 보기

**화면 정리**

- **정적 로고** — 좌상단 로고 움직임 끄기
- **숨기기** — 차단 방송, 오프라인 채널, 사이드바 추천·파트너 / 인기 카테고리 / 방송 일정, 치즈팜 광고

## 직접 빌드하기

스토어에 올리지 않은 개인용 확장이라, 쓰려면 직접 빌드해야 합니다.

```sh
open "app/Chzzk Safari Extension/Chzzk Safari Extension.xcodeproj"
```

1. Xcode의 Signing & Capabilities에서 본인 Apple ID(Personal Team)를 선택
2. ⌘R 로 빌드·실행한 뒤 Safari 확장 목록에서 활성화
3. `chzzk.naver.com` 권한 허용

> [!TIP]
> 자동 음소거 해제 등 일부 기능은 Safari → 설정 → 웹 사이트 → 자동 재생에서 `chzzk.naver.com` 을 "모든 자동 재생 허용"으로 둬야 제대로 동작합니다.

<details>
<summary>서명 없이 임시로 불러오기 (개발용)</summary>

<br>

1. Safari → 설정 → 고급에서 "웹 개발자용 기능 보기" 켜기
2. 개발자 탭에서 "허용되지 않은 확장 프로그램 허용" 켜기
3. "임시 확장 프로그램 추가..."로 `extension/` 폴더 선택
4. 소스를 고친 뒤에는 확장 "다시 로드" + 페이지 새로고침

임시로 불러온 확장은 다시 로드할 때마다 저장 데이터가 초기화됩니다.

</details>

## 구조

```
extension/   웹 확장 소스 (manifest v3, content scripts, popup)
app/         safari-web-extension-converter 로 만든 Xcode 래퍼
```

치지직은 빌드마다 바뀌는 css-module 해시 클래스를 쓰기 때문에, 클래스명을 직접 박지 않고 텍스트·구조 기반 태깅과 `data-czse-*` 속성으로 DOM을 다룹니다. 사이드바 갱신은 팔로잉 라이브 API를 직접 폴링합니다.

## Credits

Safari로 옮겨오며 아래 두 크롬 확장의 기능과 접근 방식을 참고했습니다.

- [chzzk-plus](https://github.com/kyechan99/chzzk-plus) — kyechan99
- [cheese-knife](https://github.com/jebibot/cheese-knife) — jebibot

## License

MIT © [zxc88kr](https://github.com/zxc88kr)

> 본 확장은 치지직™과 관련이 없으며, 치지직™·CHZZK™은 NAVER㈜의 등록상표입니다. 사용으로 발생하는 결과에 대한 책임은 사용자에게 있습니다.
