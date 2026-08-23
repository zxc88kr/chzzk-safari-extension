"use strict";

// 광고 스킵 (DOM 폴백): 플레이어 영역에 광고 건너뛰기 버튼이 나타나면 클릭한다.
// 네트워크 차단(rules/ads.json)이 1차 방어선이고, 이건 새어 들어온 광고용 보조.
(() => {
  const SKIP_PATTERN = /건너뛰기|건너 뛰기|skip/i;
  const AD_CONTEXT_PATTERN = /광고|\bad\b|sponsor/i;

  setInterval(async () => {
    await czse.ready;
    if (!czse.settings.adSkip) return;
    if (!location.pathname.startsWith("/live/") && !location.pathname.startsWith("/video/"))
      return;

    const player = document.querySelector(".pzp-pc, #live_player_layout, #player_layout");
    if (!player) return;

    for (const el of player.querySelectorAll("button, a")) {
      const text = `${el.textContent ?? ""} ${el.getAttribute("aria-label") ?? ""}`;
      if (!SKIP_PATTERN.test(text)) continue;
      // "건너뛰기"만으로는 다른 UI 일 수 있으니 광고 문맥까지 확인
      const context = `${text} ${el.parentElement?.textContent ?? ""}`;
      if (!AD_CONTEXT_PATTERN.test(context)) continue;
      el.click();
      return;
    }
  }, 1000);
})();
