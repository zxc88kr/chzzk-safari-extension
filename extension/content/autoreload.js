"use strict";

// 방송 시작 자동 새로고침: 오프라인 라이브 페이지에서 30초마다 상태를 폴링해
// CLOSE → OPEN 전환 시 페이지를 새로고침한다.
(() => {
  const POLL_INTERVAL = 30 * 1000;

  let watchedId = null;
  let lastStatus = null;

  setInterval(async () => {
    await czse.ready;
    if (!czse.settings.autoReload) return;

    const channelId = czse.util.channelIdFromPath();
    if (!channelId) {
      watchedId = null;
      lastStatus = null;
      return;
    }
    if (channelId !== watchedId) {
      watchedId = channelId;
      lastStatus = null;
    }

    const content = await czse.util.fetchApi([
      `/polling/v3/channels/${channelId}/live-status`,
      `/polling/v2/channels/${channelId}/live-status`,
    ]);
    const status = content?.status ?? null;

    if (lastStatus === "CLOSE" && status === "OPEN") {
      location.reload();
      return;
    }
    if (status) lastStatus = status;
  }, POLL_INTERVAL);
})();
