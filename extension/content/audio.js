"use strict";

// 오디오 컴프레서: 큰 소리를 눌러 다이내믹 레인지를 줄인다 (음량 평준화).
// WebAudio 로 비디오 오디오를 가로채 DynamicsCompressor 를 통과시킨다.
// 주의: createMediaElementSource 는 요소당 한 번만 가능하고 되돌릴 수 없으므로,
// 켤 때만 그래프를 만들고 끄면 패스스루로 우회한다.
(() => {
  // cheese-knife 기본값과 동일
  const PARAMS = { threshold: -50, knee: 40, ratio: 12, attack: 0, release: 0.25 };

  let ctx = null;
  let source = null;
  let compressor = null;
  let currentVideo = null;
  let routedOn = false;
  const attempted = new WeakSet(); // createMediaElementSource 시도한 요소들

  const setup = (video) => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      source = ctx.createMediaElementSource(video);
      compressor = ctx.createDynamicsCompressor();
      for (const [key, value] of Object.entries(PARAMS)) {
        compressor[key].value = value;
      }
      currentVideo = video;
      routedOn = false;
      return true;
    } catch {
      // 플레이어가 이미 WebAudio 를 쓰는 경우 등 — 이 요소에서는 사용 불가
      source = null;
      compressor = null;
      return false;
    }
  };

  const route = (on) => {
    if (!source) return;
    try {
      source.disconnect();
      compressor.disconnect();
    } catch {
      /* 연결 없던 경우 무시 */
    }
    if (on) {
      source.connect(compressor);
      compressor.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    routedOn = on;
  };

  setInterval(async () => {
    await czse.ready;
    const video = czse.util.findVideo();
    if (!video) return;
    const want = !!czse.settings.compressor;

    if (video !== currentVideo) {
      // 페이지 이동 등으로 비디오 요소가 바뀜 — 그래프 초기화
      source = null;
      compressor = null;
      routedOn = false;
      currentVideo = video;
    }

    if (want) {
      if (!source && !attempted.has(video)) {
        attempted.add(video);
        setup(video);
      }
      if (source && !routedOn) route(true);
    } else if (source && routedOn) {
      route(false);
    }
  }, 1000);
})();
