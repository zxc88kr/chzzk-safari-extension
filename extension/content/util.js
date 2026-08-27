"use strict";

// czse.util — 공용 헬퍼: findVideo, latency, channelIdFromPath, fetchApi, liveDetail 등
czse.util = {
  isTyping(el) {
    return !!el?.closest?.(
      'input, textarea, [contenteditable="true"], [contenteditable=""], pre[contenteditable]'
    );
  },

  // 본 플레이어 비디오 요소 (미리보기·캡처용으로 만드는 다른 video 는 제외)
  findVideo() {
    return document.querySelector(
      "video.webplayer-internal-video, .pzp-pc video, #live_player_layout video"
    );
  },

  // 라이브 페이지 여부. '/live/'(빈 id) 경로도 true 로 본다.
  isLivePage: () => location.pathname.startsWith("/live/"),

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

  // /live/ 앵커 요소의 href 에서 채널 ID 추출
  channelIdFromHref(el) {
    return czse.util.channelIdFromPath(new URL(el.href, location.href).pathname);
  },

  // 채팅 사이드바 루트
  chatAside: () => document.getElementById("aside-chatting"),

  // 사이드바 nav 목록 (없으면 빈 배열)
  sidebarNavs() {
    const sidebar = document.getElementById("sidebar");
    return sidebar ? [...sidebar.querySelectorAll("nav")] : [];
  },

  // 사이드바 섹션 nav 의 헤더 텍스트
  navHeaderText(nav) {
    return nav.querySelector('[class*="header"]')?.textContent ?? "";
  },

  // 설정 로드를 기다린 뒤 주기적으로 fn 을 호출하는 폴러
  poll(fn, ms) {
    setInterval(async () => {
      await czse.ready;
      fn(czse.settings);
    }, ms);
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

  // 라이브 상세 정보. livePlaybackJson 을 파싱해 info.livePlayback 에 부착한다.
  async liveDetail(channelId) {
    const info = await czse.util.fetchApi([
      `/service/v3.3/channels/${channelId}/live-detail`,
      `/service/v2/channels/${channelId}/live-detail`,
    ]);
    if (info) {
      try {
        info.livePlayback = JSON.parse(info.livePlaybackJson);
      } catch {
        /* 성인 방송 등 재생 정보 없음 */
      }
    }
    return info;
  },

  // livePlayback.media 에서 재생 스트림 path 선택 (HLS → LLHLS → 첫 요소)
  pickStreamPath(media) {
    if (!Array.isArray(media)) return null;
    const pick =
      media.find((m) => m.mediaId === "HLS") ??
      media.find((m) => m.mediaId === "LLHLS") ??
      media[0];
    return pick?.path || null;
  },

  pad2: (n) => String(n).padStart(2, "0"),

  timeHMS(date) {
    const { pad2 } = czse.util;
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  },

  // 영상 시작 후 경과 시간 (다시보기 채팅). 1시간이 넘으면 H:MM:SS.
  timeOffset(ms) {
    const { pad2 } = czse.util;
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
  },

  formatViewers(n) {
    if (n == null) return "";
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만명`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}천명`;
    return `${n}명`;
  },
};
