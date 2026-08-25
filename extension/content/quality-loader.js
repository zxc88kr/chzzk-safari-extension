"use strict";

// isolated world, document_start.
// CorePlayer가 만들어지기 전에 MAIN world 훅을 먼저 설치하고, 비동기로 읽은 설정은
// 공유 DOM 속성 + 메시지로 전달한다.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const MESSAGE_TYPE = "czse:max-quality-setting";

  const publish = (enabled) => {
    const root = document.documentElement;
    if (!root) return;
    root.dataset.czseMaxQuality = enabled ? "1" : "0";
    window.postMessage({ type: MESSAGE_TYPE }, location.origin);
  };

  // 설정 조회보다 주입이 반드시 먼저여야 플레이어 생성 시점을 놓치지 않는다.
  const script = document.createElement("script");
  script.src = api.runtime.getURL("content/quality-main.js");
  script.async = false;
  const cleanup = () => script.remove();
  script.addEventListener("load", cleanup, { once: true });
  script.addEventListener("error", cleanup, { once: true });
  (document.head || document.documentElement).prepend(script);

  api.storage.local
    .get({ maxQuality: false })
    .then(({ maxQuality }) => publish(!!maxQuality))
    .catch(() => publish(false));

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !("maxQuality" in changes)) return;
    publish(!!changes.maxQuality.newValue);
  });
})();
