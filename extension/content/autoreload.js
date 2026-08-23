"use strict";

// 방송 시작 자동 새로고침: 라이브 페이지(/live/{id}) 또는 채널 홈(/{channelId})에서
// 30초마다 상태를 폴링해 CLOSE → OPEN 전환 시 라이브 페이지로 이동/새로고침한다.
(() => {
  const POLL_INTERVAL = 30 * 1000;

  // /live/{id} 우선, 아니면 채널 홈(/{32자리 hex}) 매칭
  const watchTarget = () => {
    const liveId = czse.util.channelIdFromPath();
    if (liveId) return liveId;
    return location.pathname.match(/^\/([0-9a-f]{32})\/?$/)?.[1] ?? null;
  };

  let watchedId = null;
  let lastStatus = null;

  czse.util.poll(async () => {
    if (!czse.settings.autoReload) return;

    const channelId = watchTarget();
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
      // 라이브 페이지면 새로고침, 채널 홈이면 라이브 페이지로 이동
      if (czse.util.channelIdFromPath()) location.reload();
      else location.href = `/live/${channelId}`;
      return;
    }
    if (status) lastStatus = status;
  }, POLL_INTERVAL);
})();
