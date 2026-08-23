"use strict";

// 자동 음소거 해제: 라이브 진입 시 플레이어가 음소거 상태면 풀어준다.
// 페이지(경로)당 1회만 시도해서 사용자가 직접 음소거한 건 다시 건드리지 않는다.
// 주의: Safari 사이트 설정에서 자동 재생이 허용돼 있어야 확실히 동작한다.
// 정책에 막혀 재생이 멈추면 음소거로 되돌려 재생을 유지한다.
(() => {
  let appliedPath = null;

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
    if (!video.muted) return;

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
  }, 1000);
})();
