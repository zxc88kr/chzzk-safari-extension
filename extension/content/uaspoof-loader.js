"use strict";

// UA 위장 로더 (isolated world, document_start).
// 설정을 읽어 sessionStorage 플래그를 갱신하고, MAIN world 위장 스크립트를 주입한다.
// 위장은 페이지 최초 실행보다 먼저여야 효과가 있으므로, 설정 변경은 다음 새로고침부터
// 반영된다(현재 문서엔 소급 적용 불가).
(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  api.storage.local.get({ uaSpoof: false }).then((res) => {
    try {
      sessionStorage.setItem("czse-ua-spoof", res.uaSpoof ? "1" : "0");
    } catch {
      /* 무시 */
    }
  });

  // MAIN world 주입 (document_start 에 최대한 이르게)
  const script = document.createElement("script");
  script.src = api.runtime.getURL("content/uaspoof.js");
  script.async = false;
  (document.head || document.documentElement).prepend(script);
  script.remove();
})();
