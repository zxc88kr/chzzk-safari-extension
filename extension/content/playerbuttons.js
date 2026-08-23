"use strict";

// 플레이어 컨트롤 바 우측에 PIP·화면 캡처 버튼을 추가한다.
(() => {
  const BAR_SELECTOR = ".pzp-pc__bottom-buttons-right";

  const PIP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg>`;
  const CAPTURE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h1.5l1.5-2h8l1.5 2H21a0 0 0 0 1 0 0v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></svg>`;

  const makeButton = (className, label, svg, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `czse-player-btn ${className}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = svg;
    button.addEventListener("click", onClick);
    return button;
  };

  const flashError = (button) => {
    button.classList.add("czse-btn-error");
    setTimeout(() => button.classList.remove("czse-btn-error"), 1200);
  };

  const togglePip = (event) => {
    const video = czse.util.findVideo();
    if (!video) return;
    try {
      if (video.webkitSupportsPresentationMode?.("picture-in-picture")) {
        // Safari 네이티브 PIP API
        video.webkitSetPresentationMode(
          video.webkitPresentationMode === "picture-in-picture"
            ? "inline"
            : "picture-in-picture"
        );
      } else if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        video.requestPictureInPicture?.();
      }
    } catch {
      flashError(event.currentTarget);
    }
  };

  const capture = (event) => {
    const button = event.currentTarget;
    const video = czse.util.findVideo();
    if (!video?.videoWidth) return flashError(button);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return flashError(button);
        const { pad2 } = czse.util;
        const d = new Date();
        const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `chzzk-${stamp}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }, "image/png");
    } catch {
      // CORS 오염(tainted canvas) 등으로 캡처 불가
      flashError(button);
    }
  };

  setInterval(async () => {
    await czse.ready;
    const bar = document.querySelector(BAR_SELECTOR);
    if (!bar) return;

    const sync = (className, enabled, label, svg, onClick) => {
      const existing = bar.querySelector(`.${className}`);
      if (!enabled) {
        existing?.remove();
        return;
      }
      if (existing) return;
      bar.prepend(makeButton(className, label, svg, onClick));
    };

    // prepend 순서상 나중에 넣은 것이 왼쪽에 온다: [캡처][PIP][기존 버튼들]
    sync("czse-pip-btn", czse.settings.pipButton, "PIP (화면 속 화면)", PIP_SVG, togglePip);
    sync("czse-capture-btn", czse.settings.captureButton, "화면 캡처", CAPTURE_SVG, capture);
  }, 1000);
})();
