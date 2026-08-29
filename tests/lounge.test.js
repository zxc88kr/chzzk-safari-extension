"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const loungeSource = fs.readFileSync(
  path.join(ROOT, "extension/content/lounge.js"),
  "utf8"
);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// 라운지 목록을 흉내내는 최소 DOM. 실측한 구조만 재현한다:
//   행(li/tr) > … > dimmed 요소 > 안내 문구
const makeElement = (tag, className, textContent) => ({
  tagName: tag.toUpperCase(),
  className,
  textContent,
  parent: null,
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
  getAttribute(name) {
    return this.attributes[name] ?? null;
  },
  closest(selector) {
    const tags = selector.split(",").map((part) => part.trim().toUpperCase());
    for (let node = this; node; node = node.parent) {
      if (tags.includes(node.tagName)) return node;
    }
    return null;
  },
});

// row(li/tr) 안에 dimmed 요소를 넣고, dimmed 를 반환한다.
const makeRow = (rowTag, dimmedClass, text) => {
  const row = makeElement(rowTag, "_item_abc_49", text);
  const dimmed = makeElement("div", dimmedClass, text);
  dimmed.parent = row;
  return { row, dimmed };
};

const createHarness = ({ hideBlocked = false, rows = [] } = {}) => {
  const dimmedNodes = rows.map((entry) => entry.dimmed);
  const classes = new Set();
  const timers = [];
  let observerCallback = null;
  let resolveReady;

  const context = {
    czse: {
      settings: { hideBlocked },
      listeners: new Set(),
      ready: new Promise((resolve) => {
        resolveReady = resolve;
      }),
    },
    document: {
      body: {},
      documentElement: {
        classList: {
          toggle(name, on) {
            if (on) classes.add(name);
            else classes.delete(name);
          },
        },
      },
      querySelectorAll(selector) {
        assert.match(selector, /_is_dimmed_/);
        return dimmedNodes;
      },
    },
    MutationObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
    },
    setTimeout(listener) {
      timers.push(listener);
      return timers.length;
    },
  };

  vm.runInNewContext(loungeSource, context, { filename: "lounge.js" });

  return {
    classes,
    addRow(entry) {
      dimmedNodes.push(entry.dimmed);
    },
    async ready() {
      resolveReady();
      await flushPromises();
    },
    changeSetting(hideBlocked) {
      context.czse.settings.hideBlocked = hideBlocked;
      context.czse.listeners.forEach((fn) => fn(context.czse.settings));
    },
    mutate() {
      observerCallback();
      const timer = timers.shift();
      assert.equal(typeof timer, "function");
      timer();
    },
  };
};

test("차단 안내 문구가 있는 dimmed 글은 행 전체가 태깅된다", async () => {
  const home = makeRow("li", "_card_abc_56 _is_dimmed_abc_60", "차단한 유저의 게시글 입니다.");
  const board = makeRow(
    "tr",
    "_board_content_xyz_6 _is_dimmed_xyz_618",
    "차단한 유저의 게시글 입니다."
  );
  const harness = createHarness({ rows: [home, board] });

  await harness.ready();

  // 홈 위젯(li)과 게시판(tr) 둘 다, dimmed 요소가 아니라 목록의 행에 표식이 붙는다
  assert.equal(home.row.getAttribute("data-czse-blocked-post"), "1");
  assert.equal(board.row.getAttribute("data-czse-blocked-post"), "1");
  assert.equal(home.dimmed.getAttribute("data-czse-blocked-post"), null);
});

test("dimmed 라도 차단 안내 문구가 아니면 태깅하지 않는다", async () => {
  // _is_dimmed_ 는 이름이 일반적이라 다른 상태에도 쓰일 수 있다.
  // 클래스만 보고 숨기면 삭제된 글 같은 것까지 같이 사라진다.
  const deleted = makeRow("li", "_card_abc_56 _is_dimmed_abc_60", "삭제된 게시글 입니다.");
  const harness = createHarness({ rows: [deleted] });

  await harness.ready();

  assert.equal(deleted.row.getAttribute("data-czse-blocked-post"), null);
});

test("설정이 꺼져 있어도 태깅은 하고 html 클래스만 붙지 않는다", async () => {
  // 태깅을 설정에 묶으면, 도중에 켰을 때 이미 그려진 글에 소급 적용되지 않는다.
  const post = makeRow("li", "_is_dimmed_abc_60", "차단한 유저의 게시글 입니다.");
  const harness = createHarness({ hideBlocked: false, rows: [post] });

  await harness.ready();

  assert.equal(post.row.getAttribute("data-czse-blocked-post"), "1");
  assert.equal(harness.classes.has("czse-hide-blocked"), false);

  harness.changeSetting(true);
  assert.equal(harness.classes.has("czse-hide-blocked"), true);
});

test("SPA 로 목록이 나중에 그려져도 다음 sweep 이 태깅한다", async () => {
  // 라운지는 진입 시점엔 목록이 비어 있고 이후 통째로 갈아끼워진다.
  const harness = createHarness({ hideBlocked: true, rows: [] });
  await harness.ready();

  const late = makeRow("tr", "_is_dimmed_xyz_618", "차단한 유저의 게시글 입니다.");
  harness.addRow(late);
  assert.equal(late.row.getAttribute("data-czse-blocked-post"), null);

  harness.mutate();

  assert.equal(late.row.getAttribute("data-czse-blocked-post"), "1");
});

test("manifest 가 라운지에 lounge.js 만 붙인다", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "extension/manifest.json"), "utf8")
  );
  const LOUNGE = "*://game.naver.com/lounge/*";

  assert.ok(manifest.host_permissions.includes(LOUNGE));

  const entry = manifest.content_scripts.find((cs) => cs.matches.includes(LOUNGE));
  assert.ok(entry, "라운지용 content_scripts 항목이 있어야 한다");
  assert.ok(entry.js.includes("content/lounge.js"));
  assert.ok(entry.css.includes("content/content.css"));

  // 치지직 DOM 을 전제하는 스크립트는 라운지에 올리지 않는다
  for (const script of ["content/player.js", "content/chat.js", "content/sidebar.js"]) {
    assert.ok(!entry.js.includes(script), `${script} 는 라운지에 붙으면 안 된다`);
  }

  // 반대로 치지직 항목에는 lounge.js 가 끼지 않는다
  for (const cs of manifest.content_scripts) {
    if (cs.matches.includes(LOUNGE)) continue;
    assert.ok(!(cs.js ?? []).includes("content/lounge.js"));
  }

  const css = fs.readFileSync(
    path.join(ROOT, "extension/content/content.css"),
    "utf8"
  );
  assert.match(css, /html\.czse-hide-blocked \[data-czse-blocked-post\]/);
});
