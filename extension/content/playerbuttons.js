"use strict";

// 플레이어 컨트롤 바 우측에 PIP·화면 캡처 버튼을 추가한다.
(() => {
  const BAR_SELECTOR = ".pzp-pc__bottom-buttons-right";

  // 네이티브 pzp 아이콘 규격에 맞춤: 36×36 뷰박스, 중앙 ~19px 글리프, 선 1.6px
  const PIP_SVG = `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="11" width="19" height="14" rx="2"/><rect x="18.5" y="18" width="7" height="5" rx="1" fill="currentColor" stroke="none"/></svg>`;
  const CAPTURE_SVG = `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5a2 2 0 0 1 2-2h2.4l1.5-2h5.2l1.5 2h2.4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="18" cy="18.2" r="3.2"/></svg>`;

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

  // 디버깅 시 console.info 로 바꿔 캡처 단계별 로그 확인 가능
  const log = () => {};

  // 마스터 플레이리스트에서 가장 높은 화질의 변형 스트림 URL 을 고른다
  const pickBestVariant = async (masterUrl) => {
    try {
      const text = await fetch(masterUrl).then((r) => r.text());
      const lines = text.split("\n");
      let best = null;
      for (let i = 0; i < lines.length - 1; i++) {
        const m = lines[i].match(/^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+)/);
        if (!m) continue;
        const bandwidth = Number(m[1]);
        const uri = lines[i + 1]?.trim();
        if (!uri || uri.startsWith("#")) continue;
        if (!best || bandwidth > best.bandwidth) best = { bandwidth, uri };
      }
      if (best) return new URL(best.uri, masterUrl).href;
    } catch (err) {
      log("변형 선택 실패, 마스터 사용:", err?.message);
    }
    return masterUrl;
  };

  // 본 플레이어 캔버스가 오염된 경우: 스트림을 CORS 모드로 따로 열어 프레임 추출
  const captureViaCorsStream = async () => {
    const channelId = czse.util.channelIdFromPath();
    if (!channelId) return false;
    const info = await czse.util.liveDetail(channelId);
    log("live-detail:", info ? "OK" : "실패");
    let url = czse.util.pickStreamPath(info?.livePlayback?.media);
    log("스트림 URL:", url ? url.slice(0, 60) : "없음");
    if (!url) return false;
    url = await pickBestVariant(url);
    log("선택된 변형:", url.slice(0, 60));

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
      log("CORS 영상 로드:", `${video.videoWidth}x${video.videoHeight}`);
      if (!video.videoWidth) return false;
      const blob = await frameToBlob(video);
      log("프레임 추출 OK:", blob.size, "bytes — 다운로드 시도");
      downloadBlob(blob);
      return true;
    } catch (err) {
      log("CORS 캡처 실패:", err?.name ?? err);
      return false;
    } finally {
      // src = "" 는 현재 문서 URL 로 해석돼 미디어 로드를 다시 태운다. removeAttribute 로 해제.
      video.pause();
      video.removeAttribute("src");
      video.load();
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

  czse.util.poll(() => {
    const bar = document.querySelector(BAR_SELECTOR);
    if (!bar) return;

    const sync = (className, enabled, label, svg, onClick) => {
      const existing = bar.querySelector(`.${className}`);
      if (!enabled) {
        existing?.remove();
        return;
      }
      if (existing) return;
      // 클립 버튼(없으면 설정 버튼) 앞에 삽입. offsetWidth 기준은 컨트롤 바가
      // 숨겨진 동안 전부 0이 돼 맨 끝에 붙는 버그가 있어 이름 기준으로 고정.
      const anchorEl =
        bar.querySelector('[class*="custom__clip"]') ??
        [...bar.children].find((el) =>
          (el.getAttribute("aria-label") ?? "").includes("설정")
        ) ??
        null;
      bar.insertBefore(makeButton(className, label, svg, onClick), anchorEl);
    };

    // 삽입 순서: [캡처][PIP][기존 버튼들]
    sync("czse-capture-btn", czse.settings.captureButton, "화면 캡처", CAPTURE_SVG, capture);
    sync("czse-pip-btn", czse.settings.pipButton, "PIP (화면 속 화면)", PIP_SVG, togglePip);
  }, 1000);
})();
