<p align="center">
  <img src="./extension/icons/icon-128.png" width="96" alt="로고" />
</p>
<h1 align="center">Chzzk Safari Extension</h1>
<p align="center">치지직 시청 편의 기능을 담은 개인용 Safari 확장</p>

크롬용 확장은 많지만 Safari에서는 쓸 수 없어서, 자주 쓰던 기능만 골라 Safari Web Extension으로 다시 만들었습니다. 모든 기능은 확장 팝업에서 하나씩 켜고 끌 수 있습니다.

## 기능

### 플레이어

- **지연시간 표시:** 현재 지연 시간을 보여주고, 칩을 클릭하면 1.5배속으로 따라잡거나 ⇧클릭으로 라이브 지점까지 이동합니다.
- **방향키 탐색:** ←/→ 키로 라이브를 되감거나 따라갑니다.
- **자동 넓은 화면 / 음소거 해제:** 라이브에 들어가면 넓은 화면으로 바꾸고 소리를 켭니다.
- **통나무 자동 획득:** 시청 중 쌓이는 통나무를 자동으로 받습니다.
- **PIP·화면 캡처 버튼:** 화면 속 화면으로 띄우거나 현재 장면을 이미지로 저장합니다.

### 채팅

- **타임스탬프:** 새로 올라오는 채팅에 받은 시각을 붙입니다. 시스템 공지는 자동으로 숨깁니다.
- **자주 쓰는 문구:** 채팅창 버튼으로 저장해 둔 문구를 바로 입력합니다.

### 탐색

- **호버 미리보기:** 방송 링크에 마우스를 올리면 화면을 미리 보여줍니다. 크기·지연·볼륨을 조절할 수 있습니다.
- **사이드바 자동 갱신:** 30초마다 팔로잉 목록을 새로고침합니다.
- **방송 시작 자동 새로고침:** 기다리던 채널이 방송을 켜면 자동으로 열어 줍니다.
- **채널 채팅 탭:** 채널 홈에 채팅 탭을 더해 오프라인일 때도 채팅을 볼 수 있습니다.

### 화면 정리

- **정적 로고:** 좌상단 로고의 움직임을 멈춥니다.
- **숨기기:** 차단 방송, 오프라인 채널, 사이드바 추천·파트너 / 인기 카테고리 / 방송 일정, 치즈팜 광고를 각각 숨깁니다.

## 직접 빌드하기

스토어에 올리지 않은 개인용 확장이라, 쓰려면 직접 빌드해야 합니다.

```sh
open "app/Chzzk Safari Extension/Chzzk Safari Extension.xcodeproj"
```

1. Xcode의 Signing & Capabilities에서 본인 Apple ID(Personal Team)를 고릅니다.
2. ⌘R로 빌드·실행한 뒤 Safari 확장 목록에서 켭니다.
3. chzzk.naver.com 권한을 허용합니다.

> 자동 음소거 해제 등 일부 기능은 Safari → 설정 → 웹 사이트 → 자동 재생에서 chzzk.naver.com을 "모든 자동 재생 허용"으로 둬야 제대로 동작합니다.

<details>
<summary><b>서명 없이 임시로 불러오기 (개발용)</b></summary>

<br>

1. Safari → 설정 → 고급에서 "웹 개발자용 기능 보기"를 켭니다.
2. 개발자 탭에서 "허용되지 않은 확장 프로그램 허용"을 켭니다.
3. "임시 확장 프로그램 추가..."로 `extension/` 폴더를 선택합니다.
4. 소스를 고친 뒤에는 확장을 "다시 로드"하고 페이지를 새로고침합니다.

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

- [**chzzk-plus**](https://github.com/kyechan99/chzzk-plus) — kyechan99
- [**cheese-knife**](https://github.com/jebibot/cheese-knife) — jebibot

## License

MIT © [zxc88kr](https://github.com/zxc88kr)

> 본 확장은 치지직™과 관련이 없으며, 치지직™, CHZZK™은 NAVER㈜의 등록상표입니다. 사용으로 발생하는 결과에 대한 책임은 사용자에게 있습니다.
