<p align="center">
  <img src="./extension/icons/icon-128.png" width="88" alt="로고" />
</p>
<h1 align="center">CHZZK Extension</h1>
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
- **자동 넓은 화면 / 음소거 자동 해제** — 방송 입장 시 자동 적용
- **통나무 자동 획득** — 시청 중 쌓이는 통나무 자동 수령
- **PIP · 화면 캡처** — 화면 속 화면으로 띄우기, 현재 장면 이미지 저장

**채팅**

- **타임스탬프** — 새 채팅에 받은 시각 표시
- **자주 쓰는 문구** — 저장한 문구를 버튼으로 바로 입력
- **랭킹 숨기기** — 채팅창 후원·통나무 랭킹 숨김

환영 인사·필터링 안내 같은 채팅창 시스템 공지는 **항상** 숨겨집니다. (끄는 설정은 없습니다)

**탐색**

- **방송 미리보기** — 마우스를 올리면 방송 화면을 띄움, 우클릭으로 음소거 전환 (크기·지연·볼륨 조절)
- **사이드바 자동 갱신** — 팔로잉 채널의 라이브 상태를 30초마다 갱신
- **팔로잉 자동 펼치기** — 사이드바 팔로잉 목록을 진입할 때 모두 펼침
- **방송 시작 자동 입장** — 기다리던 방송이 시작되면 바로 입장
- **채널 채팅 탭** — 오프라인 채널에서도 채팅 보기

**화면 정리**

- **정적 로고** — 좌상단 로고 움직임 끄기
- **숨기기** — 차단 방송, 오프라인 채널, 사이드바 추천·파트너 / 인기 카테고리 / 방송 일정, 치즈팜 광고

## 업데이트

이미 설치한 경우, 터미널에 같은 명령을 다시 실행하면 최신 버전으로 바뀝니다. (Xcode·설정은 그대로라 다시 할 필요 없습니다)

```sh
curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
```

## 설치

**준비물** — macOS 14.5 이상, 그리고 Xcode 16 이상

> [!IMPORTANT]
> App Store에 올리지 않은 개인 확장이라 **각자 자기 맥에서 한 번 빌드**해야 하고, 그래서 Xcode가 필요합니다.
> 유료 개발자 등록(연 $99)은 **필요 없습니다.**

### 1단계 — Xcode 준비 (처음 한 번만)

1. **App Store**를 열고 `Xcode`를 검색해 설치합니다. (다운로드만 7GB 이상, 시간이 꽤 걸립니다)
2. 설치되면 **Xcode를 한 번 실행**해 초기 설정을 끝냅니다.
3. Xcode 메뉴에서 **Xcode → Settings…**(`⌘,`) → **Accounts** 탭 → 왼쪽 아래 **`+`** → **Apple ID** 로 로그인합니다.
   평소 쓰는 애플 계정이면 됩니다.

### 2단계 — 설치 명령 실행

1. **터미널**을 엽니다. — `⌘` + `Space` 를 누르고 `터미널` 이라고 입력한 뒤 Enter
2. 아래 줄을 **그대로 복사해 붙여넣고** Enter 를 누릅니다.

```sh
curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
```

내려받기 → 빌드 → 설치가 자동으로 진행됩니다. 앱은 **홈 폴더의 `응용 프로그램`**(`~/Applications`)에 설치됩니다.

처음 실행은 **수 분** 걸립니다. `▶ 빌드 중…` 에서 한참 멈춘 것처럼 보여도 정상이니 터미널을 닫지 마세요.

### 3단계 — 체크 한 번

설치가 끝나면 앱 창이 하나 뜨고(영문입니다), 이어서 **Safari 확장 설정이 자동으로 열립니다.** 거기서

1. **CHZZK Extension** 체크
2. 권한을 물으면 **chzzk.naver.com 에서 항상 허용** 선택

하면 끝입니다. 이후 주소창 옆 확장 아이콘을 누르면 기능을 하나씩 켜고 끌 수 있습니다.

> [!NOTE]
> 창이 자동으로 안 열리면 **Safari → 설정…**(`⌘,`) → **확장 프로그램** 탭에서 직접 켜주세요.
> 이미 켜 둔 상태에서 업데이트한 경우에는 설정 창이 열리지 않고 앱 창만 뜹니다. 그냥 닫으면 됩니다.

> [!TIP]
> 음소거 자동 해제 기능을 쓰려면 **치지직을 탭에서 연 채로** **Safari → 설정…**(`⌘,`) → **웹 사이트** → 왼쪽 목록의 **자동 재생** → 오른쪽 `chzzk.naver.com` 을 **"모든 자동 재생 허용"** 으로 바꿔주세요.
> 치지직을 열어두지 않으면 목록에 나타나지 않습니다.

<details>
<summary>설치가 안 될 때</summary>

<br>

**"Xcode 를 찾지 못했습니다"** — App Store에서 Xcode를 설치하고, 한 번 실행해 초기 설정까지 끝낸 뒤 다시 시도하세요. 명령어 도구(Command Line Tools)만으로는 안 됩니다.

이미 설치했는데도 같은 메시지가 나오면 아래 두 줄을 차례로 붙여넣으세요. 맥 로그인 암호를 물어보며, 입력해도 화면에 표시되지 않는 것이 정상입니다.

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

**"Apple 개발 인증서를 찾을 수 없습니다"** — 1단계 3번(Xcode에 Apple ID 추가)을 건너뛴 경우입니다. 추가 후 다시 실행하세요.

**"✗ 빌드 실패"** — Xcode를 한 번 실행해 추가 구성요소 설치까지 끝냈는지 확인하고, Safari를 완전히 종료(`⌘Q`)한 뒤 명령을 다시 실행해보세요. 그래도 안 되면 화면에 찍힌 `(전체 로그: …)` 경로를 `open` 명령으로 열어 내용을 [이슈](https://github.com/zxc88kr/chzzk-safari-extension/issues)에 첨부해 주세요.

**Safari 확장 목록에 안 보임** — Safari를 완전히 종료(`⌘Q`)했다가 다시 켜보세요.

</details>

<details>
<summary>지우고 싶을 때</summary>

<br>

1. Safari → 설정…(`⌘,`) → 확장 프로그램에서 체크 해제
2. `~/Applications` 의 **Chzzk Safari Extension.app** 을 휴지통으로
3. 내려받은 소스까지 지우려면 터미널에 `rm -rf ~/.chzzk-safari-extension`

</details>

## 권한과 데이터

확장이 요구하는 권한은 **chzzk.naver.com 하나뿐**입니다. 화면 요소를 바꾸고 방송 정보·통나무 API를 호출하는 데 씁니다.

설정과 저장한 문구는 **맥 안에만** 보관되며 어디에도 전송하지 않습니다. 수집·추적·광고 코드가 없습니다.

## Credits

Safari로 옮겨오며 아래 두 크롬 확장의 기능과 접근 방식을 참고했습니다.

- [chzzk-plus](https://github.com/kyechan99/chzzk-plus) — kyechan99
- [cheese-knife](https://github.com/jebibot/cheese-knife) — jebibot

## License

MIT © [zxc88kr](https://github.com/zxc88kr)

> 본 확장은 치지직™과 관련이 없으며, 치지직™·CHZZK™은 NAVER㈜의 등록상표입니다. 사용으로 발생하는 결과에 대한 책임은 사용자에게 있습니다.
