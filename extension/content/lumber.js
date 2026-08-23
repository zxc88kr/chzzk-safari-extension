"use strict";

// 통나무(파워) 자동 획득.
// 1) 60초마다 log-power API 에서 수령 가능한 claim 을 받아 PUT 으로 수령
// 2) 보조로 5초마다 채팅 영역의 "통나무 받기" 버튼이 보이면 클릭
(() => {
  const API_INTERVAL = 60 * 1000;
  const BUTTON_INTERVAL = 5 * 1000;

  let collecting = false;

  const collectViaApi = async () => {
    await czse.ready;
    if (!czse.settings.autoLumber || collecting) return;
    const channelId = czse.util.channelIdFromPath();
    if (!channelId) return;

    collecting = true;
    try {
      const content = await czse.util.fetchApi([
        `/service/v1/channels/${channelId}/log-power`,
      ]);
      for (const claim of content?.claims ?? []) {
        try {
          await fetch(
            `https://api.chzzk.naver.com/service/v1/channels/${channelId}/log-power/claims/${claim.claimId}`,
            { method: "PUT", credentials: "include" }
          );
        } catch {
          /* 개별 수령 실패 무시 */
        }
      }
    } finally {
      collecting = false;
    }
  };

  const clickPowerButton = async () => {
    await czse.ready;
    if (!czse.settings.autoLumber) return;
    if (!czse.util.channelIdFromPath()) return;
    const aside = document.getElementById("aside-chatting");
    if (!aside) return;

    const button = [...aside.querySelectorAll("button")].find((btn) => {
      if (btn.closest('[class*="ranking"], [class*="_ranking_"]')) return false;
      if (btn.hasAttribute("aria-expanded")) return false;
      if (btn.className.includes?.("power_button")) return true;
      const text = `${btn.textContent ?? ""} ${btn.getAttribute("aria-label") ?? ""}`;
      return /파워|power|통나무|log/i.test(text) && /받기|수령|claim|receive/i.test(text);
    });
    button?.click();
  };

  setInterval(collectViaApi, API_INTERVAL);
  setInterval(clickPowerButton, BUTTON_INTERVAL);
  setTimeout(collectViaApi, 3000); // 진입 직후 1회
})();
