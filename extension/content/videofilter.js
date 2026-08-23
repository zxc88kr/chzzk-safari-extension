"use strict";

// 영상 필터: 밝기/대비/채도/감마/샤프닝을 SVG filter 로 플레이어 비디오에 적용.
// (cheese-knife 의 videoFilter 와 같은 SVG feComponentTransfer/feConvolveMatrix 접근)
(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const FILTER_ID = "czse-video-filter";
  let filterEl = null;

  const el = (name) => document.createElementNS(SVG_NS, name);

  const build = () => {
    if (filterEl) return;
    const svg = el("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;";
    filterEl = el("filter");
    filterEl.id = FILTER_ID;
    svg.appendChild(filterEl);
    document.body.appendChild(svg);
  };

  const update = () => {
    const s = czse.settings;
    const brightness = Number(s.videoBrightness) || 1;
    const contrast = Number(s.videoContrast) || 1;
    const saturation = Number(s.videoSaturation) || 1;
    const gamma = Number(s.videoGamma) || 1;
    const sharpness = Number(s.videoSharpness) || 0;

    const parts = [];

    // 밝기/대비/감마: feComponentTransfer 로 RGB 각 채널 변환
    const transfers = [
      brightness !== 1 && { type: "linear", slope: brightness },
      contrast !== 1 && { type: "linear", slope: contrast, intercept: -contrast / 2 + 0.5 },
      gamma !== 1 && { type: "gamma", exponent: gamma },
    ].filter(Boolean);
    for (const t of transfers) {
      const transfer = el("feComponentTransfer");
      for (const ch of ["feFuncR", "feFuncG", "feFuncB"]) {
        const func = el(ch);
        func.setAttribute("type", t.type);
        if (t.slope != null) func.setAttribute("slope", t.slope);
        if (t.intercept != null) func.setAttribute("intercept", t.intercept);
        if (t.exponent != null) func.setAttribute("exponent", t.exponent);
        transfer.appendChild(func);
      }
      parts.push(transfer);
    }

    if (saturation !== 1) {
      const color = el("feColorMatrix");
      color.setAttribute("type", "saturate");
      color.setAttribute("values", String(saturation));
      parts.push(color);
    }

    if (sharpness > 0) {
      const v = Number((sharpness / 5).toFixed(2));
      const conv = el("feConvolveMatrix");
      conv.setAttribute("preserveAlpha", "true");
      conv.setAttribute("kernelMatrix", `0 ${-v} 0 ${-v} ${1 + v * 4} ${-v} 0 ${-v} 0`);
      parts.push(conv);
    }

    filterEl.replaceChildren(...parts);
    document.documentElement.classList.toggle("czse-vf", parts.length > 0);
  };

  czse.ready.then(() => {
    build();
    update();
    czse.listeners.add(update);
  });
})();
