"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const loaderSource = fs.readFileSync(
  path.join(ROOT, "extension/content/quality-loader.js"),
  "utf8"
);
const mainSource = fs.readFileSync(
  path.join(ROOT, "extension/content/quality-main.js"),
  "utf8"
);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createLoaderHarness = () => {
  let resolveSettings;
  let storageListener = null;
  const operations = [];
  const messages = [];
  const elementListeners = {};
  const root = {
    dataset: {},
    prepend(element) {
      operations.push(["prepend", element]);
    },
  };
  const script = {
    async: true,
    removed: false,
    addEventListener(type, listener) {
      elementListeners[type] = listener;
    },
    remove() {
      this.removed = true;
    },
  };
  const settingsPromise = new Promise((resolve) => {
    resolveSettings = resolve;
  });

  const context = {
    browser: {
      runtime: {
        getURL(resource) {
          operations.push(["getURL", resource]);
          return `safari-extension://${resource}`;
        },
      },
      storage: {
        local: {
          get(defaults) {
            operations.push(["get", defaults]);
            return settingsPromise;
          },
        },
        onChanged: {
          addListener(listener) {
            storageListener = listener;
          },
        },
      },
    },
    document: {
      documentElement: root,
      head: null,
      createElement(tag) {
        assert.equal(tag, "script");
        operations.push(["createElement", tag]);
        return script;
      },
    },
    location: { origin: "https://chzzk.naver.com" },
    postMessage(message, targetOrigin) {
      messages.push([message, targetOrigin]);
    },
  };
  context.window = context;

  vm.runInNewContext(loaderSource, context, { filename: "quality-loader.js" });

  return {
    elementListeners,
    messages,
    operations,
    resolveSettings,
    root,
    script,
    storageChange(value, area = "local") {
      storageListener({ maxQuality: { newValue: value } }, area);
    },
  };
};

const createTracks = (definitions, { selectionWorks = true } = {}) => {
  const state = definitions.map((track) => !!track.selected);
  let writes = 0;
  const tracks = definitions.map((definition, index) => {
    const track = { ...definition };
    Object.defineProperty(track, "selected", {
      configurable: true,
      enumerable: true,
      get: () => state[index],
      set(value) {
        writes += 1;
        if (!selectionWorks || !value) return;
        state.fill(false);
        state[index] = true;
      },
    });
    return track;
  });
  return { tracks, writes: () => writes };
};

const createMainHarness = ({
  pathname = "/live/channel-id",
  enabled = true,
  filter = () => true,
} = {}) => {
  const intervals = [];
  const timeouts = [];
  const windowListeners = {};
  const writes = [];
  const stored = new Map();
  const mainVideo = {};
  const body = {};
  const pane = { filter };

  const makeRoot = ({ containsMain = false, connected = true, area = 100 } = {}) => {
    const parent = {
      parentElement: body,
      querySelector(selector) {
        return selector === "pzp-setting-quality-pane" ? pane : null;
      },
    };
    return {
      isConnected: connected,
      parentElement: parent,
      contains(element) {
        return containsMain && element === mainVideo;
      },
      getBoundingClientRect() {
        return { width: area, height: area };
      },
    };
  };

  const documentElement = {
    dataset: { czseMaxQuality: enabled ? "1" : "0" },
  };
  const context = {
    __exports: {},
    document: {
      body,
      documentElement,
      querySelector(selector) {
        if (selector.includes("video")) return mainVideo;
        if (selector === "pzp-setting-quality-pane") return pane;
        return null;
      },
    },
    location: {
      origin: "https://chzzk.naver.com",
      pathname,
    },
    localStorage: {
      getItem(key) {
        return stored.has(key) ? stored.get(key) : null;
      },
      setItem(key, value) {
        writes.push([key, value]);
        stored.set(key, value);
      },
    },
    addEventListener(type, listener) {
      windowListeners[type] = listener;
    },
    setInterval(listener, interval) {
      intervals.push([listener, interval]);
      return intervals.length;
    },
    setTimeout(listener, interval) {
      timeouts.push([listener, interval]);
      return timeouts.length;
    },
  };
  vm.createContext(context);
  vm.runInContext(
    "globalThis.window = globalThis; " +
      "globalThis.__originalDefineProperty = Object.defineProperty; " +
      "globalThis.__originalWeakMapSet = WeakMap.prototype.set;",
    context
  );
  vm.runInContext(mainSource, context, { filename: "quality-main.js" });

  assert.equal(intervals.length, 1);
  assert.equal(intervals[0][1], 1000);

  const exposeCorePlayer = ({ useExport = true } = {}) => {
    vm.runInContext(
      `
        function MockCorePlayer(root, tracks) {
          this.videoTracks = tracks;
          this.audioTracks = [];
          this.textTracks = [];
          this.player = {};
          this._root = root;
          this._buildMarkUp();
          if (!${useExport}) this._weakMapResult = new WeakMap().set(this, {});
        }
        MockCorePlayer.prototype._buildMarkUp = function () {};
        MockCorePlayer.prototype._setVideoTracks = function () {};
        MockCorePlayer.prototype.play = function () {};
        Object.defineProperty(MockCorePlayer.prototype, "srcObject", {
          configurable: true,
          get() { return this._srcObject; },
          set(value) { this._srcObject = value; }
        });
        Object.defineProperty(MockCorePlayer.prototype, "shadowRoot", {
          configurable: true,
          get() { return this._root; }
        });
        globalThis.__MockCorePlayer = MockCorePlayer;
      `,
      context
    );

    if (useExport) {
      vm.runInContext(
        `
          Object.defineProperty(globalThis.__exports, "CorePlayer", {
            enumerable: true,
            get() { return MockCorePlayer; }
          });
          void globalThis.__exports.CorePlayer;
        `,
        context
      );
    }
  };

  const addPlayer = (name, root, trackSet) => {
    context.__nextRoot = root;
    context.__nextTracks = trackSet.tracks;
    vm.runInContext(
      `globalThis[${JSON.stringify(name)}] = new __MockCorePlayer(
        globalThis.__nextRoot,
        globalThis.__nextTracks
      );`,
      context
    );
    delete context.__nextRoot;
    delete context.__nextTracks;
  };

  return {
    addPlayer,
    context,
    documentElement,
    exposeCorePlayer,
    makeRoot,
    message() {
      windowListeners.message({
        source: vm.runInContext("window", context),
        data: { type: "czse:max-quality-setting" },
      });
    },
    stored,
    tick() {
      intervals[0][0]();
    },
    timeout() {
      timeouts[0][0]();
    },
    writes,
  };
};

test("loader는 설정 조회보다 먼저 MAIN world 스크립트를 주입한다", () => {
  const harness = createLoaderHarness();
  const operationNames = harness.operations.map(([name]) => name);
  assert.ok(operationNames.indexOf("prepend") < operationNames.indexOf("get"));
  assert.equal(
    harness.script.src,
    "safari-extension://content/quality-main.js"
  );
  assert.equal(harness.script.async, false);

  harness.elementListeners.load();
  assert.equal(harness.script.removed, true);
});

test("loader는 초기 설정과 변경을 공유 DOM에 전달한다", async () => {
  const harness = createLoaderHarness();
  harness.resolveSettings({ maxQuality: true });
  await flushPromises();

  assert.equal(harness.root.dataset.czseMaxQuality, "1");
  assert.equal(
    harness.messages.at(-1)[0].type,
    "czse:max-quality-setting"
  );
  assert.equal(
    harness.messages.at(-1)[1],
    "https://chzzk.naver.com"
  );

  harness.storageChange(false);
  assert.equal(harness.root.dataset.czseMaxQuality, "0");
});

test("CorePlayer export를 포착해 실제 최고 fixed track을 선택한다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer();
  const trackSet = createTracks([
    { label: "ABR", width: 7680, height: 4320, selected: false },
    { label: "720p", width: 1280, height: 720, selected: true },
    {
      label: "1080p",
      width: 1920,
      height: 1080,
      videoFrameRate: 60,
      selected: false,
    },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();

  assert.equal(trackSet.tracks[2].selected, true);
  assert.equal(trackSet.tracks[1].selected, false);
  assert.equal(harness.documentElement.dataset.czseQualityStatus, "applied");
  assert.equal(harness.documentElement.dataset.czseQualityTrack, "1080p");
  assert.deepEqual(harness.writes, [
    [
      "live-player-video-track",
      '{"label":"1080p","width":1920,"height":1080}',
    ],
  ]);
});

test("화질 메뉴 filter가 허용한 트랙 안에서 최고 화질을 선택한다", () => {
  const harness = createMainHarness({
    filter: (track) => track.kind === "p2p",
  });
  harness.exposeCorePlayer();
  const trackSet = createTracks([
    { label: "720p", width: 1280, height: 720, selected: true },
    {
      label: "1080p",
      width: 1920,
      height: 1080,
      kind: "p2p",
      selected: false,
    },
    {
      label: "2160p",
      width: 3840,
      height: 2160,
      kind: "main",
      selected: false,
    },
    {
      label: "720p",
      width: 1280,
      height: 720,
      kind: "p2p",
      selected: false,
    },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();
  assert.equal(trackSet.tracks[1].selected, true);
});

test("메인 video를 포함하지 않는 미리보기 플레이어는 건드리지 않는다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer();
  const preview = createTracks([
    { label: "360p", width: 640, height: 360, selected: true },
    { label: "2160p", width: 3840, height: 2160, selected: false },
  ]);
  const main = createTracks([
    { label: "720p", width: 1280, height: 720, selected: true },
    { label: "1080p", width: 1920, height: 1080, selected: false },
  ]);
  harness.addPlayer(
    "__previewPlayer",
    harness.makeRoot({ area: 500 }),
    preview
  );
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true, area: 100 }),
    main
  );

  harness.tick();
  assert.equal(preview.tracks[0].selected, true);
  assert.equal(preview.tracks[1].selected, false);
  assert.equal(main.tracks[1].selected, true);
});

test("선택 setter가 변경을 거부하면 성공 처리하거나 저장하지 않는다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer();
  const trackSet = createTracks(
    [
      { label: "720p", width: 1280, height: 720, selected: true },
      { label: "1080p", width: 1920, height: 1080, selected: false },
    ],
    { selectionWorks: false }
  );
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();
  assert.equal(trackSet.tracks[1].selected, false);
  assert.equal(harness.documentElement.dataset.czseQualityStatus, "select-failed");
  assert.deepEqual(harness.writes, []);
});

test("라디오 모드처럼 선택된 videoTrack이 없으면 영상을 다시 켜지 않는다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer();
  const trackSet = createTracks([
    { label: "720p", width: 1280, height: 720, selected: false },
    { label: "1080p", width: 1920, height: 1080, selected: false },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();
  assert.equal(trackSet.writes(), 0);
  assert.equal(harness.documentElement.dataset.czseQualityStatus, "waiting-tracks");
  assert.deepEqual(harness.writes, []);
});

test("설정 off와 비대상 경로에서는 트랙을 바꾸지 않는다", () => {
  for (const options of [
    { enabled: false, pathname: "/live/channel-id" },
    { enabled: true, pathname: "/lives" },
  ]) {
    const harness = createMainHarness(options);
    harness.exposeCorePlayer();
    const trackSet = createTracks([
      { label: "720p", width: 1280, height: 720, selected: true },
      { label: "1080p", width: 1920, height: 1080, selected: false },
    ]);
    harness.addPlayer(
      "__mainPlayer",
      harness.makeRoot({ containsMain: true }),
      trackSet
    );
    harness.tick();
    assert.equal(trackSet.tracks[0].selected, true);
    assert.equal(trackSet.writes(), 0);
  }
});

test("팝업에서 설정을 켜면 새로고침 없이 바로 적용한다", () => {
  const harness = createMainHarness({ enabled: false });
  harness.exposeCorePlayer();
  const trackSet = createTracks([
    { label: "720p", width: 1280, height: 720, selected: true },
    { label: "1080p", width: 1920, height: 1080, selected: false },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();
  assert.equal(trackSet.tracks[0].selected, true);

  harness.documentElement.dataset.czseMaxQuality = "1";
  harness.message();
  assert.equal(trackSet.tracks[1].selected, true);
});

test("VOD는 최고 트랙을 선택하되 라이브 저장 키는 쓰지 않는다", () => {
  const harness = createMainHarness({ pathname: "/video/12345" });
  harness.exposeCorePlayer();
  const trackSet = createTracks([
    { label: "720p", width: 1280, height: 720, selected: true },
    { label: "1440p", width: 2560, height: 1440, selected: false },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  harness.tick();
  assert.equal(trackSet.tracks[1].selected, true);
  assert.deepEqual(harness.writes, []);
});

test("WeakMap 폴백도 인스턴스를 포착하고 원래 반환 동작을 보존한다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer({ useExport: false });
  const trackSet = createTracks([
    { label: "720p", width: 1280, height: 720, selected: true },
    { label: "1080p", width: 1920, height: 1080, selected: false },
  ]);
  harness.addPlayer(
    "__mainPlayer",
    harness.makeRoot({ containsMain: true }),
    trackSet
  );

  assert.equal(
    vm.runInContext("__mainPlayer._weakMapResult instanceof WeakMap", harness.context),
    true
  );
  harness.tick();
  assert.equal(trackSet.tracks[1].selected, true);
});

test("CorePlayer 패치 뒤 임시 전역 훅을 원복한다", () => {
  const harness = createMainHarness();
  harness.exposeCorePlayer();
  assert.equal(
    vm.runInContext(
      "Object.defineProperty === globalThis.__originalDefineProperty",
      harness.context
    ),
    true
  );
  assert.equal(
    vm.runInContext(
      "WeakMap.prototype.set === globalThis.__originalWeakMapSet",
      harness.context
    ),
    true
  );
});

test("CorePlayer가 없는 페이지에서는 defineProperty 훅을 제한 시간 뒤 원복한다", () => {
  const harness = createMainHarness();
  assert.equal(
    vm.runInContext(
      "Object.defineProperty === globalThis.__originalDefineProperty",
      harness.context
    ),
    false
  );

  harness.timeout();

  assert.equal(
    vm.runInContext(
      "Object.defineProperty === globalThis.__originalDefineProperty",
      harness.context
    ),
    true
  );
  assert.equal(
    harness.documentElement.dataset.czseQualityStatus,
    "waiting-capture"
  );
});

test("manifest가 document_start loader와 MAIN world 리소스를 연결한다", () => {
  const defaultsSource = fs.readFileSync(
    path.join(ROOT, "extension/common/defaults.js"),
    "utf8"
  );
  const defaultsContext = {};
  vm.runInNewContext(
    `${defaultsSource}\nglobalThis.__defaults = CZSE_DEFAULTS;`,
    defaultsContext
  );
  assert.equal(defaultsContext.__defaults.maxQuality, false);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "extension/manifest.json"), "utf8")
  );
  assert.equal(manifest.version, "2.0.1");
  const loader = manifest.content_scripts.find((entry) =>
    entry.js.includes("content/quality-loader.js")
  );
  assert.equal(loader.run_at, "document_start");
  assert.ok(
    manifest.web_accessible_resources.some((entry) =>
      entry.resources.includes("content/quality-main.js")
    )
  );
  assert.ok(
    manifest.content_scripts.every(
      (entry) => !entry.js.includes("content/quality.js")
    )
  );

  const popup = fs.readFileSync(
    path.join(ROOT, "extension/popup/popup.html"),
    "utf8"
  );
  assert.match(popup, /data-key="maxQuality"/);
  assert.doesNotMatch(mainSource, /\.click\s*\(/);
});
