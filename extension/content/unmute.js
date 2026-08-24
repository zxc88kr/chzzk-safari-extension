"use strict";

// 자동 음소거 해제: 라이브에 처음 들어갔을 때 음소거 상태면 풀어준다.
//
// 사용자가 직접 끈 소리는 다시 켜지 않는다. 이걸 판별하려면 두 가지를 구분해야 한다.
//   - 사용자가 이 방송에서 직접 음소거했다        → 존중해야 함
//   - 이전 방송의 음소거가 플레이어에 남아 넘어왔다 → 존중 대상이 아님
// 그래서 방송마다 "처음 관측한 상태"를 기준선으로 잡고, 거기서 바뀔 때만 사용자
// 조작으로 본다. 우리가 만든 변화는 기준선에 즉시 반영해 오판을 막는다.
//
// 기억은 sessionStorage 에 남긴다. 페이지가 새로고침되면 스크립트가 처음부터
// 다시 돌아 메모리 상태만으로는 사용자 선택이 사라지기 때문이다.
//
// 주의: Safari 사이트 설정에서 자동 재생이 허용돼 있어야 확실히 동작한다.
// 정책에 막혀 재생이 멈추면 음소거로 되돌려 재생을 유지한다.
(() => {
  let appliedPath = null;
  let baseline = null; // { path, muted } — 이 방송에서 마지막으로 파악한 음소거 상태
  let ourChange = false; // 우리가 만든 변화를 사용자 조작으로 세지 않기 위한 표식

  const flagKey = () => `czse-user-muted:${czse.util.channelIdFromPath() ?? ""}`;

  const userMuted = () => {
    try {
      return sessionStorage.getItem(flagKey()) === "1";
    } catch {
      return false; // 프라이빗 모드 등 — 기억만 못 할 뿐 동작에는 지장 없다
    }
  };

  const rememberUserChoice = (muted) => {
    try {
      if (muted) sessionStorage.setItem(flagKey(), "1");
      else sessionStorage.removeItem(flagKey());
    } catch {
      /* 저장 실패는 무시 */
    }
  };

  document.addEventListener(
    "volumechange",
    (e) => {
      if (ourChange || !czse.util.isLivePage()) return;
      const media = e.target;
      if (!(media instanceof HTMLMediaElement)) return;

      const path = location.pathname;
      if (!baseline || baseline.path !== path) {
        baseline = { path, muted: media.muted }; // 기준선만 잡고 기록하지 않는다
        return;
      }
      if (baseline.muted === media.muted) return;
      baseline.muted = media.muted;
      rememberUserChoice(media.muted); // 기준선에서 바뀐 것 = 사용자가 직접 조작
    },
    true
  );

  czse.util.poll(() => {
    if (!czse.settings.autoUnmute) return;
    if (!czse.util.isLivePage()) {
      appliedPath = null;
      baseline = null;
      return;
    }

    const video = czse.util.findVideo();
    if (!video || video.readyState < 2) return; // 재생 준비 전이면 다음 틱에

    const path = location.pathname;
    // volumechange 를 기다리지 않고 기준선을 먼저 잡는다.
    // 진입 시 아무 이벤트도 안 오는 경우가 있어, 그때 첫 사용자 조작을 놓치게 된다.
    if (!baseline || baseline.path !== path) baseline = { path, muted: video.muted };

    if (appliedPath === path) return;
    appliedPath = path;

    if (!video.muted) return;
    if (userMuted()) return; // 사용자가 끈 소리는 건드리지 않는다

    ourChange = true;

    // 플레이어 자체 버튼을 눌러 UI 상태까지 동기화 (없으면 video 직접 제어)
    const unmuteButton = [...document.querySelectorAll("button")].find((btn) =>
      (btn.getAttribute("aria-label") ?? "").includes("음소거 해제")
    );
    if (unmuteButton) {
      unmuteButton.click();
    } else {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.5;
    }
    baseline = { path, muted: false }; // 우리가 만든 상태를 기준선에 반영

    // 자동재생 정책에 막혀 멈췄으면 음소거로 되돌리고 재생 재개
    setTimeout(() => {
      if (video.paused) {
        video.muted = true;
        baseline = { path, muted: true };
        video.play().catch(() => {});
      }
    }, 500);

    // 위 조작이 만든 volumechange 가 모두 지나간 뒤에 관찰을 재개한다
    setTimeout(() => {
      ourChange = false;
    }, 1000);
  }, 1000);
})();
