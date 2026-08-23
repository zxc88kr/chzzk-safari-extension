"use strict";

const api = globalThis.browser ?? globalThis.chrome;

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await api.storage.local.get(CZSE_DEFAULTS);
  const settings = { ...CZSE_DEFAULTS, ...stored };

  for (const input of document.querySelectorAll("[data-key]")) {
    const key = input.dataset.key;

    if (input.type === "checkbox") {
      input.checked = !!settings[key];
      input.addEventListener("change", () => {
        api.storage.local.set({ [key]: input.checked });
      });
    } else if (input.type === "range") {
      input.value = settings[key];
      const out = document.querySelector(`output[data-out="${key}"]`);
      const sync = () => {
        if (out) out.textContent = `${input.value}초`;
      };
      sync();
      input.addEventListener("input", sync);
      input.addEventListener("change", () => {
        api.storage.local.set({ [key]: Number(input.value) });
      });
    }
  }
});
