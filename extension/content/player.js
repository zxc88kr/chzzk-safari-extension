"use strict";

// 지연시간 칩 + 따라잡기(빨리감기) + 방향키 탐색
(() => {
  const CATCHUP_RATE = 1.5;
  const CATCHUP_DONE = 1; // 지연이 이 값(초) 이하로 내려오면 따라잡기 종료

  let chip = null;
  let catchingUp = false;

  const playerContainer = (video) =>
    video.closest(".pzp-pc, .pzp, #live_player_layout") || video.parentElement;

  const stopCatchUp = (video) => {
    catchingUp = false;
    chip?.classList.remove("czse-catching");
    if (video && video.playbackRate !== 1) video.playbackRate = 1;
  };

  const startCatchUp = (video) => {
    catchingUp = true;
    chip?.classList.add("czse-catching");
    video.playbackRate = CATCHUP_RATE;
  };

  const jumpToEdge = (video) => {
    const edge = czse.util.liveEdge(video);
    if (!Number.isNaN(edge)) video.currentTime = Math.max(0, edge - CATCHUP_DONE);
    stopCatchUp(video);
  };

  const ensureChip = (video) => {
    const parent = playerContainer(video);
    if (!parent) return;
    if (chip?.isConnected && chip.parentElement === parent) return;
    chip?.remove();
    chip = document.createElement("button");
    chip.type = "button";
    chip.className = "czse-latency-chip";
    chip.title = "클릭: 1.5배속 따라잡기 · Shift+클릭: 라이브 지점으로 이동";
    chip.addEventListener("click", (e) => {
      const video = czse.util.findVideo();
      if (!video) return;
      if (e.shiftKey) jumpToEdge(video);
      else if (catchingUp) stopCatchUp(video);
      else startCatchUp(video);
    });
    parent.appendChild(chip);
  };

  czse.util.poll(() => {
    const video =
      czse.util.isLivePage() && czse.settings.latencyDisplay
        ? czse.util.findVideo()
        : null;
    if (!video) {
      chip?.remove();
      chip = null;
      catchingUp = false;
      return;
    }
    ensureChip(video);
    const lat = czse.util.latency(video);
    chip.textContent = Number.isNaN(lat) ? "지연 –" : `지연 ${lat.toFixed(1)}초`;
    if (catchingUp) {
      if (Number.isNaN(lat) || lat <= CATCHUP_DONE) stopCatchUp(video);
      else if (video.playbackRate === 1) video.playbackRate = CATCHUP_RATE; // 외부에서 리셋된 경우 복구
    }
  }, 1000);


  // 방향키 탐색 (라이브 전용 — VOD 는 기본 플레이어가 이미 지원)
  document.addEventListener(
    "keydown",
    (e) => {
      if (!czse.settings.arrowSeek || !czse.util.isLivePage()) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (czse.util.isTyping(e.target)) return;
      const video = czse.util.findVideo();
      if (!video || video.duration !== Infinity) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      const step = Number(czse.settings.seekStep) || 5;
      if (e.key === "ArrowLeft") {
        let start = 0;
        try {
          if (video.buffered.length) start = video.buffered.start(0);
        } catch {
          /* buffered 접근 실패 무시 */
        }
        video.currentTime = Math.max(start + 0.5, video.currentTime - step);
        stopCatchUp(video);
      } else {
        const edge = czse.util.liveEdge(video);
        if (Number.isNaN(edge) || video.currentTime + step >= edge - CATCHUP_DONE) {
          jumpToEdge(video);
        } else {
          video.currentTime += step;
        }
      }
    },
    true
  );
})();
