"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const mainSource = fs.readFileSync(
  path.join(ROOT, "extension/content/chattime-main.js"),
  "utf8"
);
const loaderSource = fs.readFileSync(
  path.join(ROOT, "extension/content/chattime-loader.js"),
  "utf8"
);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const profileOf = (nickname) => JSON.stringify({ nickname });

// ── MAIN world 하네스 ────────────────────────────────────────
// 치지직 대신 우리가 프레임을 밀어 넣고, postMessage 로 나온 항목을 본다.
const createMainHarness = () => {
  const messages = [];
  const sockets = [];
  let fetchCalls = 0;

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.listeners = [];
      this.sent = [];
      sockets.push(this);
    }
    addEventListener(type, listener) {
      if (type === "message") this.listeners.push(listener);
    }
    send(data) {
      this.sent.push(data);
    }
    emit(data) {
      for (const listener of this.listeners) listener({ data });
    }
  }

  class FakeXHR {
    constructor() {
      this.listeners = {};
      this.responseType = "";
    }
    open() {}
    send() {}
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    finish(body) {
      this.responseText = body;
      this.listeners.load?.();
    }
  }

  const context = {
    location: { origin: "https://chzzk.naver.com" },
    postMessage(message, targetOrigin) {
      messages.push([message, targetOrigin]);
    },
    WebSocket: FakeWebSocket,
    XMLHttpRequest: FakeXHR,
    fetch(url) {
      fetchCalls += 1;
      const payload = context.__nextResponse;
      return Promise.resolve({
        clone: () => ({ json: () => Promise.resolve(payload) }),
        url,
      });
    },
  };
  context.window = context;

  vm.runInNewContext(mainSource, context, { filename: "chattime-main.js" });

  return {
    context,
    messages,
    items: () => messages.flatMap(([message]) => message.items),
    openSocket() {
      return new context.WebSocket("wss://kr-ss1.chat.naver.com/chat");
    },
    async fetchChats(url, payload) {
      context.__nextResponse = payload;
      await context.fetch(url);
      await flushPromises();
      await flushPromises();
    },
    xhr(url, body) {
      const request = new context.XMLHttpRequest();
      request.open("GET", url);
      request.send();
      request.finish(body);
      return request;
    },
    fetchCalls: () => fetchCalls,
  };
};

// ── isolated world 하네스 ────────────────────────────────────
const createLoaderHarness = () => {
  let messageListener = null;
  const script = {
    addEventListener() {},
    remove() {},
  };
  const context = {
    browser: {
      runtime: { getURL: (resource) => `safari-extension://${resource}` },
    },
    document: {
      documentElement: { prepend() {} },
      head: { prepend() {} },
      createElement: () => script,
    },
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(loaderSource, context, { filename: "chattime-loader.js" });
  // vm 안의 window 는 sandbox 객체가 아니라 vm 자신의 전역이다.
  // 실제 브라우저처럼 event.source 가 그 전역이어야 로더의 출처 검사를 통과한다.
  const vmWindow = vm.runInContext("globalThis", context);

  return {
    key: (...args) => context.czseChatTime.key(...args),
    lookup: (...args) => context.czseChatTime.lookup(...args),
    lookupMine: (...args) => context.czseChatTime.lookupMine(...args),
    onDeliver: (fn) => context.czseChatTime.onDeliver(fn),
    deliver(items) {
      messageListener({
        source: vmWindow,
        data: { type: "czse:chat-time", items },
      });
    },
  };
};

// ── MAIN world ───────────────────────────────────────────────

test("라이브 신규 채팅의 ctime 을 작성 시각으로 뽑는다", () => {
  const harness = createMainHarness();
  const socket = harness.openSocket();

  socket.emit(
    JSON.stringify({
      cmd: 93101,
      bdy: [{ ctime: 1787841464251, msg: "ㅋㅋㅋ", profile: profileOf("우디만두") }],
    })
  );

  assert.deepEqual(
    harness.items().map(({ t, mode, nickname, msg }) => [t, mode, nickname, msg]),
    [[1787841464251, "clock", "우디만두", "ㅋㅋㅋ"]]
  );
});

test("초 단위로 오는 ctime 은 ms 로 정규화한다", () => {
  const harness = createMainHarness();
  harness.openSocket().emit(
    JSON.stringify({
      cmd: 93101,
      bdy: [{ ctime: 1787841464, msg: "안녕", profile: profileOf("멍석말이") }],
    })
  );

  assert.equal(harness.items()[0].t, 1787841464000);
});

test("라이브 백로그는 필드명이 달라도(messageTime/content) 똑같이 뽑는다", () => {
  const harness = createMainHarness();
  harness.openSocket().emit(
    JSON.stringify({
      cmd: 15101,
      bdy: {
        messageList: [
          { messageTime: 1787841000000, content: "첫줄", profile: profileOf("가") },
          { messageTime: 1787841001000, content: "둘째줄", profile: profileOf("나") },
        ],
      },
    })
  );

  assert.deepEqual(
    harness.items().map((item) => [item.nickname, item.t, item.mode]),
    [
      ["가", 1787841000000, "clock"],
      ["나", 1787841001000, "clock"],
    ]
  );
});

test("인증 등 채팅이 아닌 프레임은 아무것도 내보내지 않는다", () => {
  const harness = createMainHarness();
  harness.openSocket().emit(
    JSON.stringify({ cmd: 10100, bdy: { accTkn: "x", auth: "SEND", uuid: "u", sid: "s" } })
  );

  assert.equal(harness.messages.length, 0);
});

test("깨진 JSON 이 와도 던지지 않는다", () => {
  const harness = createMainHarness();
  const socket = harness.openSocket();

  assert.doesNotThrow(() => socket.emit("<html>not json</html>"));
  assert.equal(harness.messages.length, 0);
});

test("다시보기 응답은 playerMessageTime 을 영상 시점으로 뽑는다", async () => {
  const harness = createMainHarness();

  await harness.fetchChats(
    "https://api.chzzk.naver.com/service/v1/videos/14701431/chats?playerMessageTime=25000",
    {
      content: {
        previousVideoChats: [
          { playerMessageTime: 1000, content: "이전", profile: profileOf("가") },
        ],
        videoChats: [
          { playerMessageTime: 68376, content: "{:d_52:}", profile: profileOf("나") },
        ],
      },
    }
  );

  assert.deepEqual(
    harness.items().map((item) => [item.nickname, item.t, item.mode]),
    [
      ["가", 1000, "offset"],
      ["나", 68376, "offset"],
    ]
  );
});

test("채팅 목록이 아닌 응답은 걸러진다 (chat-rules 등)", async () => {
  const harness = createMainHarness();

  await harness.fetchChats("https://api.chzzk.naver.com/nng_main/v1/chats/access-token", {
    content: { accessToken: "x", extraToken: "y" },
  });

  assert.equal(harness.messages.length, 0);
});

test("XHR 로 온 다시보기 응답도 잡는다", () => {
  const harness = createMainHarness();

  harness.xhr(
    "https://api.chzzk.naver.com/service/v1/videos/1/chats?playerMessageTime=0",
    JSON.stringify({
      content: {
        videoChats: [{ playerMessageTime: 500, content: "야", profile: profileOf("다") }],
      },
    })
  );

  assert.deepEqual(
    harness.items().map(({ t, mode, nickname, msg }) => [t, mode, nickname, msg]),
    [[500, "offset", "다", "야"]]
  );
});

test("채팅과 무관한 요청은 응답을 건드리지 않는다", async () => {
  const harness = createMainHarness();

  await harness.fetchChats("https://api.chzzk.naver.com/service/v1/channels/abc", {
    content: { videoChats: [{ playerMessageTime: 1, content: "x", profile: profileOf("라") }] },
  });

  assert.equal(harness.messages.length, 0);
});

test("내가 보낸 채팅은 ACK 의 ctime 을 본문과 짝지어 미리 내보낸다", () => {
  // broadcast(93101)는 0.3초쯤 뒤에야 온다(실측). ACK 엔 시각만, 전송 프레임엔 본문만
  // 있어서 둘을 합쳐야 화면에 줄이 뜨는 시점에 스탬프를 찍을 수 있다.
  const harness = createMainHarness();
  const socket = harness.openSocket();

  socket.send(JSON.stringify({ cmd: 3101, tid: 3, cid: "N2cowr", bdy: { msg: "ㅇㅇ" } }));
  assert.equal(harness.messages.length, 0); // 전송만으론 아직 시각을 모른다

  socket.emit(JSON.stringify({ cmd: 13101, tid: 3, bdy: { ctime: 1788025480406 } }));

  assert.deepEqual(
    harness.items().map(({ t, mode, msg, mine, src }) => [t, mode, msg, mine, src]),
    [[1788025480406, "clock", "ㅇㅇ", true, "N2cowr"]]
  );
});

test("전송 프레임은 손대지 않고 그대로 서버로 넘긴다", () => {
  const harness = createMainHarness();
  const socket = harness.openSocket();
  const frame = JSON.stringify({ cmd: 3101, tid: 1, cid: "N1", bdy: { msg: "야" } });

  socket.send(frame);

  assert.deepEqual(socket.sent, [frame]);
});

test("ACK 에 tid 가 없으면 보낸 순서대로 짝짓는다", () => {
  const harness = createMainHarness();
  const socket = harness.openSocket();

  socket.send(JSON.stringify({ cmd: 3101, cid: "N1", bdy: { msg: "첫" } }));
  socket.send(JSON.stringify({ cmd: 3101, cid: "N1", bdy: { msg: "둘" } }));
  socket.emit(JSON.stringify({ cmd: 13101, bdy: { ctime: 1788025480000 } }));
  socket.emit(JSON.stringify({ cmd: 13101, bdy: { ctime: 1788025480500 } }));

  assert.deepEqual(
    harness.items().map(({ msg, t }) => [msg, t]),
    [
      ["첫", 1788025480000],
      ["둘", 1788025480500],
    ]
  );
});

test("짝지을 전송이 없는 ACK 는 아무것도 내보내지 않는다", () => {
  const harness = createMainHarness();

  harness
    .openSocket()
    .emit(JSON.stringify({ cmd: 13101, tid: 9, bdy: { ctime: 1788025480406 } }));

  assert.equal(harness.messages.length, 0);
});

// ── isolated world ───────────────────────────────────────────

test("key 는 이모티콘 플레이스홀더와 공백을 무시한다 — DOM 텍스트와 맞추기 위해", () => {
  const loader = createLoaderHarness();
  assert.equal(loader.key("가", "{:d_52:}야 옹"), loader.key("가", "야옹"));
  assert.notEqual(loader.key("가", "야옹"), loader.key("나", "야옹"));
});

test("lookup 은 같은 키를 끝(최신)에서부터 순번으로 짝짓는다", () => {
  // 같은 사람이 같은 문구를 반복해도("?"), 아래에서 k번째 노드는 항상 같은 항목을 받는다.
  const loader = createLoaderHarness();
  loader.deliver([
    { t: 100, mode: "clock", nickname: "가", msg: "?" },
    { t: 200, mode: "clock", nickname: "나", msg: "ㅋㅋ" },
    { t: 300, mode: "clock", nickname: "가", msg: "?" },
  ]);
  const k = loader.key("가", "?");

  assert.equal(loader.lookup(k, 0).t, 300);
  assert.equal(loader.lookup(k, 1).t, 100);
  assert.equal(loader.lookup(k, 2), null);
  assert.equal(loader.lookup(loader.key("나", "ㅋㅋ"), 0).t, 200);
});

test("lookup 은 소비하지 않는다 — 재렌더로 스탬프가 날아가도 같은 답", () => {
  const loader = createLoaderHarness();
  loader.deliver([{ t: 100, mode: "clock", nickname: "가", msg: "안녕" }]);
  const k = loader.key("가", "안녕");

  assert.equal(loader.lookup(k, 0).t, 100);
  assert.equal(loader.lookup(k, 0).t, 100);
});

test("중복 전달된 항목은 한 번만 쌓인다", () => {
  // 다시보기 폴링은 구간이 겹쳐 같은 메시지를 반복해서 준다.
  const loader = createLoaderHarness();
  const item = { t: 100, mode: "offset", nickname: "가", msg: "야" };
  loader.deliver([item]);
  loader.deliver([item]);
  const k = loader.key("가", "야");

  assert.equal(loader.lookup(k, 0).t, 100);
  assert.equal(loader.lookup(k, 1), null);
});

test("이모티콘만 있는 메시지는 빈 본문 키로 짝지어진다", () => {
  const loader = createLoaderHarness();
  loader.deliver([{ t: 300, mode: "offset", nickname: "가", msg: "{:d_52:}" }]);

  assert.equal(loader.lookup(loader.key("가", ""), 0).t, 300);
});

test("모르는 채팅은 null — 시각을 지어내지 않는다", () => {
  const loader = createLoaderHarness();
  loader.deliver([{ t: 100, mode: "clock", nickname: "가", msg: "안녕" }]);

  assert.equal(loader.lookup(loader.key("나", "안녕"), 0), null);
});

test("항목이 도착하면 onDeliver 로 알린다, 중복만 온 배달은 알리지 않는다", () => {
  const loader = createLoaderHarness();
  let calls = 0;
  loader.onDeliver(() => {
    calls += 1;
  });
  const item = { t: 100, mode: "clock", nickname: "가", msg: "안녕" };

  loader.deliver([item]);
  assert.equal(calls, 1);
  loader.deliver([item]);
  assert.equal(calls, 1);
  loader.deliver([{ t: 200, mode: "clock", nickname: "나", msg: "야" }]);
  assert.equal(calls, 2);
});

test("다시보기: 재생 위치 컷오프 뒤의 미래 항목은 짝짓지 않는다", () => {
  // REST 는 재생 위치보다 몇 분 앞까지 미리 온다. 이모티콘-전용처럼 같은 키가
  // 반복되면 미래 사본을 집어 시간이 튄다 — 실측으로 잡힌 버그.
  const loader = createLoaderHarness();
  loader.deliver([
    { t: 60000, mode: "offset", nickname: "가", msg: "{:d_52:}", src: "N1" },
    { t: 3600000, mode: "offset", nickname: "가", msg: "{:d_52:}", src: "N1" },
  ]);
  const k = loader.key("가", "");

  assert.equal(loader.lookup(k, 0, "offset", 65000).t, 60000); // 재생 65초: 1시간 뒤 사본 제외
  assert.equal(loader.lookup(k, 0).t, 3600000); // 컷오프 없으면(라이브) 최신
});

test("채팅 채널이 바뀌면 히스토리를 비운다", () => {
  // SPA 로 다른 채널·다른 영상에 가면 이전 히스토리가 오염원이 된다.
  const loader = createLoaderHarness();
  loader.deliver([{ t: 100, mode: "clock", nickname: "가", msg: "안녕", src: "N1" }]);
  loader.deliver([{ t: 200, mode: "clock", nickname: "나", msg: "야", src: "N2" }]);

  assert.equal(loader.lookup(loader.key("가", "안녕"), 0), null);
  assert.equal(loader.lookup(loader.key("나", "야"), 0).t, 200);
});

test("라이브 페이지는 clock 항목만 짝짓는다 — 되감기 offset 오염 차단", () => {
  // 라이브에서 이모티콘-전용 채팅이 26:20(영상 시점)으로 찍힌 실측 버그.
  const loader = createLoaderHarness();
  loader.deliver([
    { t: 1787841464251, mode: "clock", nickname: "가", msg: "{:d_1:}", src: "N1" },
    { t: 1580000, mode: "offset", nickname: "가", msg: "{:d_1:}", src: "N1" },
  ]);
  const k = loader.key("가", "");

  assert.equal(loader.lookup(k, 0, "clock").t, 1787841464251);
  assert.equal(loader.lookup(k, 0, "offset").t, 1580000);
});

test("mine 은 본문만으로 짝지어지고 일반 조회에는 안 걸린다", () => {
  // ACK 엔 닉네임이 없어 일반 키를 만들 수 없다. 순번 계산을 오염시키면 안 된다.
  const loader = createLoaderHarness();
  const now = Date.now();
  loader.deliver([{ t: now, mode: "clock", mine: true, msg: "ㅇㅇ", src: "N1" }]);

  assert.equal(loader.lookupMine("ㅇㅇ").t, now);
  assert.equal(loader.lookup(loader.key(null, "ㅇㅇ"), 0, "clock"), null);
});

test("mine 도 이모티콘 플레이스홀더·공백을 무시하고 짝짓는다", () => {
  const loader = createLoaderHarness();
  loader.deliver([{ t: Date.now(), mode: "clock", mine: true, msg: "{:d_52:}야 옹", src: "N1" }]);

  assert.equal(loader.lookupMine("야옹").mode, "clock");
});

test("오래된 mine 은 짝짓지 않는다 — 엉뚱한 줄에 붙는 걸 막는다", () => {
  // broadcast 가 도착하기 전 잠깐만 쓰는 값이다. 그 뒤엔 일반 항목이 같은 값을 준다.
  const loader = createLoaderHarness();
  loader.deliver([{ t: Date.now() - 60000, mode: "clock", mine: true, msg: "ㅇㅇ", src: "N1" }]);

  assert.equal(loader.lookupMine("ㅇㅇ"), null);
});
