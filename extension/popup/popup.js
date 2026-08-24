"use strict";

const api = globalThis.browser ?? globalThis.chrome;

const MANIFEST_URL =
  "https://raw.githubusercontent.com/zxc88kr/chzzk-safari-extension/main/extension/manifest.json";
const CHECK_KEY = "czseUpdateCheck";
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

// 저장 실패 등 문제를 팝업 하단에 표시
const showError = (message) => {
  let box = document.getElementById("czse-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "czse-error";
    box.style.cssText =
      "margin:8px 16px 12px;padding:8px 10px;border-radius:8px;" +
      "background:rgba(255,80,80,0.12);color:#ff8080;font-size:11px;" +
      "line-height:1.4;word-break:break-all;";
    document.body.appendChild(box);
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

// 새 버전이 있으면 알림 띄우기. 결과는 캐시해 자주 조회하지 않는다.
const checkUpdate = async () => {
  const current = api.runtime.getManifest().version;
  let latest = null;

  try {
    const cached = (await api.storage.local.get(CHECK_KEY))[CHECK_KEY];
    if (cached && Date.now() - cached.at < CHECK_INTERVAL) {
      latest = cached.version;
    } else {
      const res = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!res.ok) return;
      latest = (await res.json()).version;
      await api.storage.local.set({ [CHECK_KEY]: { version: latest, at: Date.now() } });
    }
  } catch {
    return; // 네트워크·권한 문제면 조용히 넘어간다
  }

  if (!latest || compareVersions(latest, current) <= 0) return;

  document.getElementById("update-version").textContent = latest;
  document.getElementById("update").hidden = false;
};

document.addEventListener("DOMContentLoaded", async () => {
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

    checkUpdate();
  } catch (err) {
    showError(`초기화 실패: ${err?.message ?? err}`);
  }
});
