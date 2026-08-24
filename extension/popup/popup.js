"use strict";

const api = globalThis.browser ?? globalThis.chrome;

const MANIFEST_URL =
  "https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/extension/manifest.json";

// 문제가 생기면 팝업 맨 위에 표시한다.
// (아래에 붙이면 설정 목록이 길어 화면 밖으로 밀려 아무도 못 본다)
const showError = (message) => {
  let box = document.getElementById("czse-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "czse-error";
    box.style.cssText =
      "margin:8px 16px;padding:8px 10px;border-radius:8px;" +
      "background:rgba(255,80,80,0.12);color:#ff8080;font-size:11px;" +
      "line-height:1.4;word-break:break-all;";
    document.body.prepend(box);
  }
  box.textContent = message;
};

// "1.15.0" 형태를 숫자 배열로 비교. a 가 b 보다 크면 양수.
const compareVersions = (a, b) => {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};

// 새 버전이 있으면 알림 띄우기.
// 팝업은 자주 열지 않아 매번 조회해도 부담이 없다. 캐시를 두면 새 버전이 나와도
// 한참 뒤에야 알려주게 돼(실제로 그래서 알림이 안 뜨는 혼란이 있었다) 두지 않는다.
const checkUpdate = async () => {
  const current = api.runtime.getManifest().version;
  let latest = null;

  try {
    // 쿼리로 캐시를 우회한다. Safari 는 raw.githubusercontent.com 을 5분 캐시하는데
    // cache: "no-store" 로는 CDN 캐시를 못 뚫어, 방금 올린 버전을 한참 못 보게 된다.
    // raw 는 쿼리스트링을 무시하고 같은 파일을 주지만 캐시 키는 URL 단위라 매번 새로 받는다.
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    latest = (await res.json()).version;
  } catch {
    return; // 네트워크 문제면 조용히 넘어간다
  }

  if (!latest || compareVersions(latest, current) <= 0) return;

  document.getElementById("update-version").textContent = latest;
  document.getElementById("update").hidden = false;
};

const initSettings = async () => {
  try {
    if (typeof CZSE_DEFAULTS === "undefined") {
      showError("defaults.js 로드 실패");
      return;
    }

    const versionEl = document.getElementById("version");
    if (versionEl) versionEl.textContent = `v${api.runtime.getManifest().version}`;

    const stored = await api.storage.local.get(CZSE_DEFAULTS);
    const settings = { ...CZSE_DEFAULTS, ...stored };

    const save = async (key, value, revert) => {
      try {
        await api.storage.local.set({ [key]: value });
      } catch (err) {
        showError(`저장 실패 (${key}): ${err?.message ?? err}`);
        revert?.();
      }
    };

    // 부모 토글이 꺼지면 종속 행(data-parent)을 숨긴다
    const syncDependents = (parentKey, on) => {
      document
        .querySelectorAll(`[data-parent="${parentKey}"]`)
        .forEach((row) => row.classList.toggle("row-hidden", !on));
    };

    for (const input of document.querySelectorAll("[data-key]")) {
      const key = input.dataset.key;

      if (input.type === "checkbox") {
        input.checked = !!settings[key];
        syncDependents(key, input.checked);
        input.addEventListener("change", () => {
          syncDependents(key, input.checked);
          save(key, input.checked, () => {
            input.checked = !input.checked;
            syncDependents(key, input.checked);
          });
        });
      } else if (input.type === "range") {
        input.value = settings[key];
        const out = document.querySelector(`output[data-out="${key}"]`);
        const sync = () => {
          if (out) out.textContent = `${input.value}${input.dataset.unit ?? ""}`;
        };
        sync();
        input.addEventListener("input", sync);
        input.addEventListener("change", () => save(key, Number(input.value)));
      }
    }

  } catch (err) {
    showError(`초기화 실패: ${err?.message ?? err}`);
  }
};

// 둘을 따로 실행한다. 한쪽이 실패해도 다른 쪽은 영향을 받지 않는다
// (업데이트 확인이 설정 초기화 뒤에 붙어 있어 통째로 건너뛰던 문제가 있었다)
document.addEventListener("DOMContentLoaded", () => {
  initSettings();
  checkUpdate();
});
