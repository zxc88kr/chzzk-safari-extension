"use strict";

// 자동 음소거 해제: 라이브에 처음 들어갔을 때 음소거 상태면 풀어준다.
//
// 사용자가 직접 음소거하면 그 선택을 기억해 다시는 풀지 않는다. 경로당 1회
// 가드만으로는 부족한데, 페이지가 새로고침되면 스크립트가 처음부터 다시 돌아
// 가드가 초기화되기 때문이다. 그래서 새로고침에도 남는 sessionStorage 에 적어둔다.
//
// 주의: Safari 사이트 설정에서 자동 재생이 허용돼 있어야 확실히 동작한다.
// 정책에 막혀 재생이 멈추면 음소거로 되돌려 재생을 유지한다.
(() => {
  let appliedPath = null;
  let ourChange = false; // 우리가 바꾼 것을 사용자 조작으로 오해하지 않기 위한 표식

  const flagKey = () => `czse-user-muted:${czse.util.channelIdFromPath() ?? ""}`;

  const userMuted = () => {
    try {
      return sessionStorage.getItem(flagKey()) === "1";
    } catch {
      return false; // 프라이빗 모드 등 — 기억하지 못할 뿐 동작에는 지장 없다
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

  // 사용자가 음소거를 켜고 끄는 것을 관찰한다. 우리가 만든 변화는 제외.
  document.addEventListener(
    "volumechange",
    (e) => {
      if (ourChange || !czse.util.isLivePage()) return;
      const media = e.target;
      if (media instanceof HTMLMediaElement) rememberUserChoice(media.muted);
    },
    true
  );

  czse.util.poll(() => {
    if (!czse.settings.autoUnmute) return;
    if (!czse.util.isLivePage()) {
      appliedPath = null;
      return;
    }
    if (appliedPath === location.pathname) return;

    const video = czse.util.findVideo();
    if (!video || video.readyState < 2) return; // 재생 준비 전이면 다음 틱에

    appliedPath = location.pathname;
    if (video.muted && userMuted()) return; // 사용자가 끈 소리는 건드리지 않는다
    if (!video.muted) return;

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

    // 자동재생 정책에 막혀 멈췄으면 음소거로 되돌리고 재생 재개
    setTimeout(() => {
      if (video.paused) {
        video.muted = true;
        video.play().catch(() => {});
      }
    }, 500);

    // 위 조작이 만든 volumechange 가 모두 지나간 뒤에 관찰을 재개한다
    setTimeout(() => {
      ourChange = false;
    }, 1000);
  }, 1000);
})();
