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

## 설치

**준비물** — macOS 13(Ventura) 이상, 그리고 Xcode

> [!IMPORTANT]
> App Store에 올리지 않은 개인 확장이라, **각자 자기 맥에서 한 번 빌드**해야 합니다.
> Safari 확장은 앱으로 포장해 서명해야만 설치되는데, 그 서명에 Xcode가 필요하기 때문입니다.
> 유료 개발자 등록(연 $99)은 **필요 없습니다.**

### 1단계 — Xcode 준비 (처음 한 번만)

1. **App Store**를 열고 `Xcode`를 검색해 설치합니다. (약 4GB, 시간이 꽤 걸립니다)
2. 설치되면 **Xcode를 한 번 실행**해 초기 설정을 끝냅니다.
3. Xcode 메뉴에서 **Xcode → Settings…**(`⌘,`) → **Accounts** 탭 → 왼쪽 아래 **`+`** → **Apple ID** 로 로그인합니다.
   평소 쓰는 애플 계정이면 됩니다.

### 2단계 — 설치 명령 실행

1. **터미널**을 엽니다. — `⌘` + `Space` 를 누르고 `터미널` 이라고 입력한 뒤 Enter
2. 아래 줄을 **그대로 복사해 붙여넣고** Enter 를 누릅니다.

```sh
curl -fsSL https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/install.sh | bash
```

내려받기 → 빌드 → 설치가 자동으로 진행됩니다. 앱은 **홈 폴더의 `응용 프로그램`**(`~/Applications`)에 설치되고, 끝나면 자동으로 실행됩니다.

### 3단계 — Safari에서 켜기

1. **Safari → 설정…**(`⌘,`) → **확장 프로그램** 탭
2. 목록에서 **Chzzk Safari Extension** 을 체크
3. 권한을 물으면 **chzzk.naver.com 에서 항상 허용**을 선택

주소창 옆 확장 아이콘을 누르면 기능을 하나씩 켜고 끌 수 있습니다.

> [!TIP]
> 자동 음소거 해제 기능을 쓰려면 **Safari → 설정 → 웹 사이트 → 자동 재생**에서 `chzzk.naver.com` 을 **"모든 자동 재생 허용"** 으로 바꿔주세요. Safari가 기본적으로 소리 있는 자동 재생을 막기 때문입니다.

<details>
<summary>설치가 안 될 때</summary>

<br>

**"Xcode 가 필요합니다"** — App Store에서 Xcode를 설치하고, 한 번 실행해 초기 설정까지 끝낸 뒤 다시 시도하세요. 명령어 도구(Command Line Tools)만으로는 안 됩니다.

**"Apple 개발 인증서를 찾을 수 없습니다"** — 1단계 3번(Xcode에 Apple ID 추가)을 건너뛴 경우입니다. 추가 후 다시 실행하세요.

**Safari 확장 목록에 안 보임** — Safari를 완전히 종료(`⌘Q`)했다가 다시 켜보세요.

**업데이트하려면** — 같은 설치 명령을 다시 실행하면 최신 버전으로 갱신됩니다.

</details>

<details>
<summary>수동으로 빌드하기 / 개발용</summary>

<br>

저장소를 받은 뒤 빌드 스크립트를 실행합니다. 팀 ID는 키체인의 개발 인증서에서 자동으로 찾습니다.

```sh
git clone https://github.com/zxc88kr/chzzk-safari-extension.git
cd chzzk-safari-extension
./scripts/build.sh
```

Xcode에서 직접 열려면 `app/Chzzk Safari Extension/Chzzk Safari Extension.xcodeproj` 를 열고 Signing & Capabilities에서 본인 팀을 고른 뒤 ⌘R 하면 됩니다.

**서명 없이 임시로 불러오기** — 코드를 자주 고칠 때 빠릅니다.

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
