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

  const downloadBlob = (blob) => {
    const { pad2 } = czse.util;
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chzzk-${stamp}.png`;
    document.body.appendChild(a); // Safari 는 DOM 밖 앵커 클릭을 무시할 수 있다
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };

  const frameToBlob = (video) =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      try {
        // 캔버스가 CORS 오염됐으면 여기서 SecurityError
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob null"))),
          "image/png"
        );
      } catch (err) {
        reject(err);
      }
    });

  // 본 플레이어 캔버스가 오염된 경우: 스트림을 CORS 모드로 따로 열어 프레임 추출
  const captureViaCorsStream = async () => {
    const channelId = czse.util.channelIdFromPath();
    if (!channelId) return false;
    const info = await czse.util.fetchApi([
      `/service/v3.3/channels/${channelId}/live-detail`,
      `/service/v2/channels/${channelId}/live-detail`,
    ]);
    let media = null;
    try {
      media = JSON.parse(info.livePlaybackJson).media;
    } catch {
      return false;
    }
    const url = (
      media?.find((m) => m.mediaId === "HLS") ??
      media?.find((m) => m.mediaId === "LLHLS") ??
      media?.[0]
    )?.path;
    if (!url) return false;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;left:-9999px;width:2px;";
    document.body.appendChild(video);
    try {
      video.src = url;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
        video.addEventListener("canplay", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("load error"));
        }, { once: true });
        video.play().catch(() => {});
      });
      if (!video.videoWidth) return false;
      downloadBlob(await frameToBlob(video));
      return true;
    } catch {
      return false;
    } finally {
      video.src = "";
      video.remove();
    }
  };

  const capture = async (event) => {
    const button = event.currentTarget;
    const video = czse.util.findVideo();
    if (!video?.videoWidth) return flashError(button);
    try {
      downloadBlob(await frameToBlob(video));
    } catch {
      // tainted canvas — CORS 스트림 폴백 (수 초 걸릴 수 있음)
      button.classList.add("czse-btn-busy");
      const ok = await captureViaCorsStream().catch(() => false);
      button.classList.remove("czse-btn-busy");
      if (!ok) flashError(button);
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
