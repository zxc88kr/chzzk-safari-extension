"use strict";

// MAIN world. 치지직이 쓰는 CorePlayer 인스턴스를 잡아 실제 videoTrack을 선택한다.
// DOM 화질 메뉴의 click 이벤트는 React/Vue 상태 변경으로 이어지지 않아 사용하지 않는다.
(() => {
  if (window.__czseQualityMain) return;
  window.__czseQualityMain = true;

  const MESSAGE_TYPE = "czse:max-quality-setting";
  const LIVE_TRACK_KEY = "live-player-video-track";
  const PLAYER_STALE_MS = 5 * 60 * 1000;
  const INACTIVE_CLEANUP_INTERVAL = 60 * 1000;
  const players = new Map();
  const patchedPrototypes = new WeakSet();
  let lastInactiveCleanupAt = 0;

  const setStatus = (status, track = null) => {
    const root = document.documentElement;
    if (!root) return;
    if (root.dataset.czseQualityStatus !== status) {
      root.dataset.czseQualityStatus = status;
    }
    if (track) {
      if (root.dataset.czseQualityTrack !== track) {
        root.dataset.czseQualityTrack = track;
      }
    } else if (root.dataset.czseQualityTrack !== undefined) {
      delete root.dataset.czseQualityTrack;
    }
  };

  const enabled = () =>
    document.documentElement?.dataset.czseMaxQuality === "1";

  const isPlayerPage = () =>
    location.pathname.startsWith("/live/") ||
    location.pathname.startsWith("/video/");

  const looksLikeCorePlayerPrototype = (prototype) => {
    if (!prototype) return false;
    const srcObject = Object.getOwnPropertyDescriptor(prototype, "srcObject");
    return (
      typeof prototype._buildMarkUp === "function" &&
      typeof prototype._setVideoTracks === "function" &&
      typeof prototype.play === "function" &&
      !!srcObject?.get &&
      !!srcObject?.set
    );
  };

  const looksLikeCorePlayer = (candidate) => {
    try {
      return (
        !!candidate &&
        Object.prototype.hasOwnProperty.call(candidate, "videoTracks") &&
        Object.prototype.hasOwnProperty.call(candidate, "audioTracks") &&
        Object.prototype.hasOwnProperty.call(candidate, "textTracks") &&
        Object.prototype.hasOwnProperty.call(candidate, "player") &&
        !!candidate.shadowRoot &&
        looksLikeCorePlayerPrototype(Object.getPrototypeOf(candidate))
      );
    } catch {
      return false;
    }
  };

  const remember = (player) => {
    if (!looksLikeCorePlayer(player)) return;
    players.set(player, Date.now());
    setStatus(enabled() ? "captured" : "disabled");
  };

  const originalDefineProperty = Object.defineProperty;
  const definePropertyDescriptor = Object.getOwnPropertyDescriptor(
    Object,
    "defineProperty"
  );
  const originalWeakMapSet = WeakMap.prototype.set;
  const weakMapSetDescriptor = Object.getOwnPropertyDescriptor(
    WeakMap.prototype,
    "set"
  );
  let definePropertyHookRestored = false;
  let weakMapHookRestored = false;

  const restoreDefinePropertyHook = () => {
    if (definePropertyHookRestored) return;
    definePropertyHookRestored = true;
    try {
      if (Object.defineProperty === hookedDefineProperty) {
        originalDefineProperty(Object, "defineProperty", definePropertyDescriptor);
      }
    } catch {
      /* 이미 페이지가 같은 전역을 바꿨다면 그대로 둔다 */
    }
  };

  const restoreWeakMapHook = () => {
    if (weakMapHookRestored) return;
    weakMapHookRestored = true;
    try {
      if (WeakMap.prototype.set === hookedWeakMapSet) {
        originalDefineProperty(WeakMap.prototype, "set", weakMapSetDescriptor);
      }
    } catch {
      /* 이미 페이지가 같은 전역을 바꿨다면 그대로 둔다 */
    }
  };

  const restoreCaptureHooks = () => {
    restoreDefinePropertyHook();
    restoreWeakMapHook();
  };

  const patchCorePlayer = (CorePlayer) => {
    const prototype = CorePlayer?.prototype;
    if (!looksLikeCorePlayerPrototype(prototype)) return false;
    if (patchedPrototypes.has(prototype)) {
      restoreCaptureHooks();
      return true;
    }

    const buildDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      "_buildMarkUp"
    );
    const originalBuild = buildDescriptor?.value;
    if (typeof originalBuild !== "function") return false;

    try {
      originalDefineProperty(prototype, "_buildMarkUp", {
        ...buildDescriptor,
        value: function (...args) {
          const result = originalBuild.apply(this, args);
          remember(this);
          return result;
        },
      });
    } catch {
      return false;
    }

    patchedPrototypes.add(prototype);
    setStatus(enabled() ? "hooked" : "disabled");
    restoreCaptureHooks();
    return true;
  };

  // Webpack이 `CorePlayer` export getter를 정의할 때 생성자를 먼저 패치한다.
  function hookedDefineProperty(target, property, descriptor) {
    if (property === "CorePlayer" && typeof descriptor?.get === "function") {
      const originalGet = descriptor.get;
      const result = originalDefineProperty(target, property, {
        ...descriptor,
        get() {
          const CorePlayer = originalGet.call(this);
          patchCorePlayer(CorePlayer);
          return CorePlayer;
        },
      });
      // export getter 자체가 이후 접근도 감시하므로 전역 defineProperty는 즉시 원복한다.
      restoreDefinePropertyHook();
      Promise.resolve().then(() => {
        try {
          patchCorePlayer(target[property]);
        } catch {
          /* 순환 모듈 평가 중이면 실제 getter 접근이나 WeakMap 폴백을 기다린다 */
        }
      });
      return result;
    }
    return originalDefineProperty(target, property, descriptor);
  }

  // export getter가 이미 캐시된 경우의 폴백. 생성자가 초기화를 마친 뒤 자신을
  // WeakMap 키로 등록하는 현재 CorePlayer 구조를 이용한다.
  function hookedWeakMapSet(key, value) {
    const result = originalWeakMapSet.call(this, key, value);
    if (looksLikeCorePlayer(key)) {
      remember(key);
      patchCorePlayer(key.constructor);
    }
    return result;
  }

  try {
    originalDefineProperty(Object, "defineProperty", {
      ...definePropertyDescriptor,
      value: hookedDefineProperty,
    });
    originalDefineProperty(WeakMap.prototype, "set", {
      ...weakMapSetDescriptor,
      value: hookedWeakMapSet,
    });
    setStatus(enabled() ? "hooking" : "disabled");
  } catch {
    restoreCaptureHooks();
    setStatus("hook-failed");
  }

  // 플레이어 번들이 없는 페이지에서는 무거운 defineProperty 훅만 제한 시간 뒤
  // 원복한다. WeakMap 폴백은 이후 SPA 이동에서 새 플레이어가 생길 때까지 유지한다.
  window.setTimeout(() => {
    restoreDefinePropertyHook();
    if (!players.size && enabled() && isPlayerPage()) {
      setStatus("waiting-capture");
    }
  }, 15000);

  const playerRoot = (player) => {
    try {
      return player.shadowRoot;
    } catch {
      return null;
    }
  };

  const rootArea = (root) => {
    try {
      const rect = root.getBoundingClientRect();
      return Math.max(0, rect.width) * Math.max(0, rect.height);
    } catch {
      return 0;
    }
  };

  const connectedPlayers = (now = Date.now()) => {
    const connected = [];
    for (const [player, lastConnectedAt] of players) {
      const root = playerRoot(player);
      if (root?.isConnected) {
        players.set(player, now);
        connected.push({ player, root });
      } else if (now - lastConnectedAt > PLAYER_STALE_MS) {
        players.delete(player);
      }
    }
    return connected;
  };

  const cleanInactivePlayers = () => {
    const now = Date.now();
    if (now - lastInactiveCleanupAt < INACTIVE_CLEANUP_INTERVAL) return;
    lastInactiveCleanupAt = now;
    connectedPlayers(now);
  };

  const activePlayer = () => {
    const connected = connectedPlayers();
    if (!connected.length) return null;

    const mainVideo = document.querySelector(
      "#live_player_layout video, #player_layout video, " +
        ".pzp-pc video, video.webplayer-internal-video"
    );
    const containingVideo = mainVideo
      ? connected.filter(({ root }) => root.contains(mainVideo))
      : [];
    const candidates = containingVideo.length ? containingVideo : connected;
    if (candidates.length === 1) return candidates[0];

    let largest = candidates[0];
    let largestArea = rootArea(largest.root);
    for (let i = 1; i < candidates.length; i += 1) {
      const area = rootArea(candidates[i].root);
      if (area > largestArea) {
        largest = candidates[i];
        largestArea = area;
      }
    }
    return largest;
  };

  const qualityPane = (root) => {
    let ancestor = root?.parentElement;
    while (ancestor && ancestor !== document.body) {
      const pane = ancestor.querySelector?.("pzp-setting-quality-pane");
      if (pane) return pane;
      ancestor = ancestor.parentElement;
    }
    return document.querySelector("pzp-setting-quality-pane");
  };

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const rank = (track) => [
    Math.min(number(track.width), number(track.height)),
    number(track.width) * number(track.height),
    number(track.videoFrameRate ?? track.frameRate ?? track.fps),
    number(track.videoBitrate ?? track.bandwidth ?? track.bitrate),
  ];

  const compareRank = (a, b) => {
    const left = rank(a);
    const right = rank(b);
    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) return left[i] - right[i];
    }
    return 0;
  };

  const highestAvailableTrack = (player, root) => {
    let tracks;
    try {
      tracks = Array.from(player.videoTracks ?? []);
    } catch {
      return null;
    }

    // 치지직 라디오 모드는 모든 videoTrack의 selected를 false로 만든다.
    // 이 상태에서 영상을 다시 켜지 않고, 라디오 모드가 끝날 때까지 기다린다.
    if (!tracks.some((track) => track?.selected)) return null;

    const pane = qualityPane(root);
    const filter = typeof pane?.filter === "function" ? pane.filter : null;
    tracks = tracks.filter((track) => {
      if (String(track?.label).toUpperCase() === "ABR") return false;
      if (Math.min(number(track?.width), number(track?.height)) <= 0) return false;
      if (!filter) return true;
      try {
        return !!filter.call(pane, track);
      } catch {
        return false;
      }
    });
    if (!tracks.length) return null;

    const highest = tracks.reduce((best, track) =>
      compareRank(track, best) > 0 ? track : best
    );
    const selected = tracks.find((track) => track.selected);
    return selected && compareRank(selected, highest) === 0 ? selected : highest;
  };

  const saveLivePreference = (track) => {
    if (!location.pathname.startsWith("/live/")) return;
    const value = JSON.stringify({
      label: track.label,
      width: number(track.width),
      height: number(track.height),
    });
    try {
      if (localStorage.getItem(LIVE_TRACK_KEY) !== value) {
        localStorage.setItem(LIVE_TRACK_KEY, value);
      }
    } catch {
      /* 프라이빗 모드 등 저장 실패는 현재 재생 화질에 영향 없음 */
    }
  };

  const enforce = () => {
    if (!enabled()) {
      cleanInactivePlayers();
      setStatus("disabled");
      return;
    }
    if (!isPlayerPage()) {
      cleanInactivePlayers();
      setStatus("idle");
      return;
    }

    const active = activePlayer();
    if (!active) {
      setStatus(players.size ? "waiting-player" : "waiting-capture");
      return;
    }

    const highest = highestAvailableTrack(active.player, active.root);
    if (!highest) {
      setStatus("waiting-tracks");
      return;
    }

    if (!highest.selected) {
      try {
        highest.selected = true;
      } catch {
        setStatus("select-failed");
        return;
      }
      if (!highest.selected) {
        setStatus("select-failed");
        return;
      }
      setStatus("applied", String(highest.label));
    } else {
      setStatus("active", String(highest.label));
    }
    saveLivePreference(highest);
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== MESSAGE_TYPE) return;
    enforce();
  });
  window.setInterval(enforce, 1000);
})();
