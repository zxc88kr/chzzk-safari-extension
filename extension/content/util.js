"use strict";

czse.util = {
  // 채팅 입력창 등 타이핑 중인 요소인지 (단축키 무시용)
  isTyping(el) {
    return !!el?.closest?.(
      'input, textarea, [contenteditable="true"], [contenteditable=""], pre[contenteditable]'
    );
  },

  // 플레이어 비디오 요소
  findVideo() {
    return document.querySelector(
      "video.webplayer-internal-video, .pzp-pc video, #live_player_layout video"
    );
  },

  // 라이브 엣지(시청 가능한 가장 최신 지점)
  liveEdge(video) {
    try {
      const s = video.seekable;
      if (s?.length) return s.end(s.length - 1);
      const b = video.buffered;
      if (b?.length) return b.end(b.length - 1);
    } catch {
      /* seekable/buffered 접근 실패 무시 */
    }
    return NaN;
  },

  // 라이브 엣지 대비 현재 재생 위치의 지연(초)
  latency(video) {
    const edge = czse.util.liveEdge(video);
    return Number.isNaN(edge) ? NaN : Math.max(0, edge - video.currentTime);
  },

  // /live/{channelId} 경로에서 채널 ID 추출
  channelIdFromPath(pathname = location.pathname) {
    const m = pathname.match(/^\/live\/([^/?#]+)/);
    return m ? m[1] : null;
  },

  // 치지직 API 호출. 버전 개편에 대비해 후보 경로를 순서대로 시도한다.
  async fetchApi(paths) {
    for (const path of paths) {
      try {
        const res = await fetch(`https://api.chzzk.naver.com${path}`, {
          credentials: "include",
        });
        if (!res.ok) continue;
        const json = await res.json();
        if (json.code === 200) return json.content;
      } catch {
        /* 네트워크 오류 시 다음 후보 */
      }
    }
    return null;
  },

  pad2: (n) => String(n).padStart(2, "0"),

  timeHMS(date) {
    const { pad2 } = czse.util;
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  },

  formatViewers(n) {
    if (n == null) return "";
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만명`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}천명`;
    return `${n}명`;
  },
};
