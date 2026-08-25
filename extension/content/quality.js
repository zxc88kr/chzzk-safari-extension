"use strict";

// 최고 화질 유지: 라이브의 저장 화질을 1080p로 고정하고,
// 라이브·다시보기 화질 목록에서 실제로 제공되는 첫 번째(최고) 항목을 선택한다.
(() => {
  const LIVE_TRACK_KEY = "live-player-video-track";
  const MAX_LIVE_TRACK = JSON.stringify({ label: "1080p", width: 1920, height: 1080 });

  const isPlayerPage = () =>
    czse.util.isLivePage() || location.pathname.startsWith("/video/");

  const keepLivePreference = () => {
    if (!czse.util.isLivePage()) return;
    try {
      if (localStorage.getItem(LIVE_TRACK_KEY) !== MAX_LIVE_TRACK) {
        localStorage.setItem(LIVE_TRACK_KEY, MAX_LIVE_TRACK);
      }
    } catch {
      /* 프라이빗 모드 등 저장 실패 시 DOM 선택만 사용 */
    }
  };

  const selectHighestAvailable = () => {
    const list = document.querySelector(".pzp-setting-quality-pane__list-container");
    const highest = list?.firstElementChild;
    if (!highest) return;
    if (highest.matches(".pzp-ui-setting-pane-item--checked")) return;
    highest.click();
  };

  czse.util.poll(() => {
    if (!czse.settings.maxQuality || !isPlayerPage()) return;
    keepLivePreference();
    selectHighestAvailable();
  }, 1000);
})();
