"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const qualitySource = fs.readFileSync(
  path.join(ROOT, "extension/content/quality.js"),
  "utf8"
);

const createHarness = ({
  pathname = "/live/channel-id",
  enabled = true,
  storedTrack = null,
  highestSelected = false,
  hasQualityList = true,
} = {}) => {
  let pollCallback = null;
  let pollInterval = null;
  let currentTrack = storedTrack;
  let queryCount = 0;
  let clickCount = 0;
  const writes = [];

  const highest = {
    matches(selector) {
      assert.equal(selector, ".pzp-ui-setting-pane-item--checked");
      return highestSelected;
    },
    click() {
      clickCount += 1;
    },
  };

  const context = {
    location: { pathname },
    localStorage: {
      getItem(key) {
        assert.equal(key, "live-player-video-track");
        return currentTrack;
      },
      setItem(key, value) {
        writes.push([key, value]);
        currentTrack = value;
      },
    },
    document: {
      querySelector(selector) {
        queryCount += 1;
        assert.equal(selector, ".pzp-setting-quality-pane__list-container");
        return hasQualityList ? { firstElementChild: highest } : null;
      },
    },
    czse: {
      settings: { maxQuality: enabled },
      util: {
        isLivePage: () => pathname.startsWith("/live/"),
        poll(callback, interval) {
          pollCallback = callback;
          pollInterval = interval;
        },
      },
    },
  };

  vm.runInNewContext(qualitySource, context, { filename: "quality.js" });
  assert.equal(typeof pollCallback, "function");
  assert.equal(pollInterval, 1000);

  return {
    context,
    tick: () => pollCallback(),
    result: () => ({ clickCount, currentTrack, queryCount, writes }),
  };
};

test("설정이 꺼져 있으면 라이브 화질을 변경하지 않는다", () => {
  const harness = createHarness({ enabled: false });
  harness.tick();
  assert.deepEqual(harness.result(), {
    clickCount: 0,
    currentTrack: null,
    queryCount: 0,
    writes: [],
  });
});

test("라이브에서 저장 화질과 실제 선택을 최고 화질로 맞춘다", () => {
  const harness = createHarness({ storedTrack: '{"label":"720p"}' });
  harness.tick();

  const expected = '{"label":"1080p","width":1920,"height":1080}';
  assert.deepEqual(harness.result(), {
    clickCount: 1,
    currentTrack: expected,
    queryCount: 1,
    writes: [["live-player-video-track", expected]],
  });
});

test("라이브 저장 화질이 이미 최고이면 불필요하게 다시 쓰지 않는다", () => {
  const expected = '{"label":"1080p","width":1920,"height":1080}';
  const harness = createHarness({ storedTrack: expected });
  harness.tick();
  assert.deepEqual(harness.result().writes, []);
});

test("다시보기에서는 저장 키를 건드리지 않고 실제 최고 화질을 선택한다", () => {
  const harness = createHarness({ pathname: "/video/12345" });
  harness.tick();

  assert.equal(harness.result().clickCount, 1);
  assert.deepEqual(harness.result().writes, []);
});

test("최고 화질이 이미 선택돼 있으면 다시 클릭하지 않는다", () => {
  const harness = createHarness({ highestSelected: true });
  harness.tick();
  assert.equal(harness.result().clickCount, 0);
});

test("플레이어가 아직 로드되지 않아도 오류 없이 다음 주기를 기다린다", () => {
  const harness = createHarness({ hasQualityList: false });
  assert.doesNotThrow(() => harness.tick());
  assert.equal(harness.result().clickCount, 0);
});

test("라이브·다시보기 외 페이지에서는 아무것도 변경하지 않는다", () => {
  const harness = createHarness({ pathname: "/lives" });
  harness.tick();
  assert.deepEqual(harness.result(), {
    clickCount: 0,
    currentTrack: null,
    queryCount: 0,
    writes: [],
  });
});

test("설정·manifest·팝업이 maxQuality 기능을 함께 노출한다", () => {
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
  assert.ok(manifest.content_scripts[0].js.includes("content/quality.js"));

  const popup = fs.readFileSync(
    path.join(ROOT, "extension/popup/popup.html"),
    "utf8"
  );
  assert.match(popup, /data-key="maxQuality"/);
});
