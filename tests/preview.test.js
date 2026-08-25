"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const previewSource = fs.readFileSync(
  path.join(__dirname, "..", "extension/content/preview.js"),
  "utf8"
);

const createHarness = () => {
  const listeners = {};
  const timers = [];
  const requests = [];
  let cache = null;
  let now = 0;

  class TrackingMap extends Map {
    constructor(...args) {
      super(...args);
      cache = this;
    }
  }

  const makeElement = (tagName) => ({
    children: [],
    className: "",
    isConnected: false,
    style: {},
    tagName: tagName.toUpperCase(),
    append(...nodes) {
      nodes.forEach((node) => this.appendChild(node));
    },
    appendChild(node) {
      this.children.push(node);
      node.parentElement = this;
      return node;
    },
    querySelector(selector) {
      if (selector !== "video") return null;
      return this.children.find((child) => child.tagName === "VIDEO") ?? null;
    },
    remove() {
      this.isConnected = false;
    },
  });

  const body = makeElement("body");
  body.appendChild = function (node) {
    this.children.push(node);
    node.parentElement = this;
    node.isConnected = true;
    return node;
  };

  const context = {
    Date: { now: () => now },
    Map: TrackingMap,
    clearTimeout() {},
    czse: {
      settings: {
        hoverPreview: true,
        previewDelay: 0.1,
        previewVolume: 0,
        previewWidth: 400,
      },
      util: {
        channelIdFromHref: (anchor) => anchor.channelId,
        channelIdFromPath: () => null,
        formatViewers: () => "",
        async liveDetail(channelId) {
          requests.push(channelId);
          return {
            channel: { channelName: channelId },
            liveImageUrl: "",
            liveTitle: channelId,
            status: "CLOSE",
          };
        },
        pickStreamPath: () => null,
      },
    },
    document: {
      body,
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
      createElement: makeElement,
    },
    innerHeight: 900,
    innerWidth: 1440,
    setTimeout(listener) {
      timers.push(listener);
      return timers.length;
    },
    addEventListener(type, listener) {
      listeners[`window:${type}`] = listener;
    },
  };
  context.window = context;

  vm.runInNewContext(previewSource, context, { filename: "preview.js" });

  const anchor = (channelId) => ({
    channelId,
    contains: () => false,
    getBoundingClientRect: () => ({
      bottom: 200,
      height: 100,
      left: 100,
      right: 300,
      top: 100,
      width: 200,
    }),
    closest(selector) {
      return selector.startsWith("a[") ? this : null;
    },
  });

  return {
    cache: () => cache,
    click() {
      listeners.click({});
    },
    async hover(channelId) {
      listeners.mouseover({ target: anchor(channelId) });
      const timer = timers.shift();
      assert.equal(typeof timer, "function");
      await timer();
    },
    requests,
    setNow(value) {
      now = value;
    },
  };
};

test("호버 미리보기 캐시는 만료 항목을 지우고 최대 50개만 유지한다", async () => {
  const harness = createHarness();

  for (let i = 0; i < 60; i += 1) {
    if (i) harness.click();
    await harness.hover(`channel-${i}`);
  }

  assert.equal(harness.cache().size, 50);
  assert.equal(harness.cache().has("channel-0"), false);
  assert.equal(harness.cache().has("channel-9"), false);
  assert.equal(harness.cache().has("channel-10"), true);
  assert.equal(harness.cache().has("channel-59"), true);
  assert.equal(harness.requests.length, 60);

  harness.click();
  await harness.hover("channel-59");
  assert.equal(harness.requests.length, 60);

  harness.setNow(60 * 1000);
  harness.click();
  await harness.hover("channel-60");
  assert.equal(harness.cache().size, 1);
  assert.equal(harness.cache().has("channel-60"), true);
});
