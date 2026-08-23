"use strict";

// 사이드바 자동 갱신: 30초마다 MAIN world 스크립트에 갱신 요청을 보낸다.
// (팔로잉 목록 리페치는 React effect 를 다시 실행해야 해서 페이지 컨텍스트가 필요)
(() => {
  const REFRESH_INTERVAL = 30 * 1000;

  // Safari 는 content_scripts 의 world: "MAIN" 을 지원하지 않으므로
  // web_accessible_resources 로 노출한 스크립트를 <script> 태그로 주입한다.
  if (!document.getElementById("czse-main-world")) {
    const script = document.createElement("script");
    script.id = "czse-main-world";
    script.src = czse.api.runtime.getURL("content/main-world.js");
    (document.head || document.documentElement).appendChild(script);
  }

  setInterval(async () => {
    await czse.ready;
    if (!czse.settings.sidebarRefresh) return;
    window.postMessage({ type: "czse:refresh-sidebar" }, location.origin);
  }, REFRESH_INTERVAL);
})();
