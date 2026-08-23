"use strict";

const api = globalThis.browser ?? globalThis.chrome;

// 저장 실패 등 문제를 팝업 하단에 표시 (원인 파악용)
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof CZSE_DEFAULTS === "undefined") {
      showError("defaults.js 로드 실패");
      return;
    }
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

    for (const input of document.querySelectorAll("[data-key]")) {
      const key = input.dataset.key;

      if (input.type === "checkbox") {
        input.checked = !!settings[key];
        input.addEventListener("change", () => {
          save(key, input.checked, () => {
            input.checked = !input.checked;
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
});
