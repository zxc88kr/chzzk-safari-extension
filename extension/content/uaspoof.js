// UA 위장(클립 차단 우회 실험): 페이지 최초 실행 시점에 navigator.userAgent 를
// Chrome 값으로 덮어쓴다. MAIN world 로 document_start 에 주입되어 치지직 코드보다
// 먼저 실행되어야 한다.
//
// 설정 로드는 비동기라 이 시점에 czse.settings 를 못 읽으므로, isolated content
// script(uaspoof-loader.js)가 sessionStorage 플래그를 심어 두고 여기서 그걸 본다.
(() => {
  "use strict";
  if (window.__czseUaSpoofed) return;
  try {
    if (sessionStorage.getItem("czse-ua-spoof") !== "1") return;
  } catch {
    return;
  }
  window.__czseUaSpoofed = true;

  const CHROME_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  const define = (obj, key, value) => {
    try {
      Object.defineProperty(obj, key, { get: () => value, configurable: true });
    } catch {
      /* 재정의 불가 시 무시 */
    }
  };

  define(navigator, "userAgent", CHROME_UA);
  define(navigator, "vendor", "Google Inc.");
})();
