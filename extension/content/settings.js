"use strict";

// 확장 전역 네임스페이스. 이후 content script 들이 czse.* 로 접근한다.
const czse = {
  api: globalThis.browser ?? globalThis.chrome,
  settings: { ...CZSE_DEFAULTS },
  listeners: new Set(), // 설정 변경 콜백
  ready: null,
};

czse.ready = (async () => {
  const stored = await czse.api.storage.local.get(CZSE_DEFAULTS);
  czse.settings = { ...CZSE_DEFAULTS, ...stored };

  czse.api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      czse.settings[key] = newValue;
    }
    czse.listeners.forEach((fn) => fn(czse.settings));
  });
})();
