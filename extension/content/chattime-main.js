"use strict";

// MAIN world. 채팅의 실제 작성 시각을 페이지 트래픽에서 주워 isolated world 로 넘긴다.
// 라이브는 WebSocket, 다시보기는 REST 라 둘 다 후킹한다.
//
// 실측(2026-08) — 경로마다 필드명이 달라 ?? 로 흡수한다. 닉네임은 셋 다 profile(JSON 문자열) 안:
//   라이브 백로그  bdy.messageList[]      { messageTime, content }
//   라이브 신규    bdy[]                  { ctime,       msg }
//   다시보기       content.videoChats[]   { playerMessageTime, content }
(() => {
  if (window.__czseChatTimeMain) return;
  window.__czseChatTimeMain = true;

  const MESSAGE_TYPE = "czse:chat-time";
  const SEND_CHAT = 3101; // 내가 보내는 채팅
  const SEND_CHAT_ACK = 13101; // 그 응답 — 서버 ctime 만 있고 본문·닉네임은 없다
  const MAX_PENDING_SENDS = 8; // ACK 를 못 받은 전송이 쌓이는 걸 막는 상한
  // 경로 모양이 아니라 응답 모양으로 판별한다. 이건 파싱 대상을 좁히는 1차 거름망일 뿐이라
  // 치지직이 경로를 바꿔도 vodEntries 가 알아서 빈 배열을 낸다.
  const MAYBE_CHATS = /\/chats\b/;

  // ctime 은 초로 오는 경우가 있어 ms 로 맞춘다.
  const clockMs = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n > 1e12 ? n : n * 1000;
  };

  const toEntry = (item, t, mode) => {
    if (!item || typeof item !== "object" || t == null || !Number.isFinite(t)) return null;
    let nickname = null;
    try {
      nickname = JSON.parse(item.profile)?.nickname ?? null;
    } catch {
      return null;
    }
    if (!nickname) return null;
    return {
      t,
      mode,
      nickname,
      msg: String(item.content ?? item.msg ?? ""),
      // 채팅 채널 식별자 — 채널·영상을 옮기면 히스토리를 비우기 위한 값
      src: String(item.chatChannelId ?? item.cid ?? item.channelId ?? ""),
    };
  };

  const liveEntries = (frame) => {
    const bdy = frame?.bdy;
    const list = Array.isArray(bdy)
      ? bdy
      : Array.isArray(bdy?.messageList)
        ? bdy.messageList
        : null;
    if (!list?.length) return [];
    return list
      .map((it) => toEntry(it, clockMs(it.messageTime ?? it.ctime), "clock"))
      .filter(Boolean);
  };

  const vodEntries = (json) => {
    const content = json?.content;
    const list = [
      ...(content?.previousVideoChats ?? []),
      ...(content?.videoChats ?? []),
    ];
    return list
      .map((it) => toEntry(it, Number(it.playerMessageTime), "offset"))
      .filter(Boolean);
  };

  const publish = (items) => {
    if (items.length) window.postMessage({ type: MESSAGE_TYPE, items }, location.origin);
  };

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = new Proxy(OriginalWebSocket, {
    construct(Target, args) {
      const socket = new Target(...args);
      // 내가 친 채팅은 broadcast 가 늦게 온다(실측: 전송 +52ms 에 ACK, +321ms 에 broadcast).
      // 화면엔 그 전에 줄이 떠 있으니 ACK 시각을 쓰는데, ACK 엔 본문이 없고 전송 프레임엔
      // 시각이 없어 둘을 짝지어야 한다.
      const sent = [];
      const originalSend = socket.send.bind(socket);
      socket.send = (data) => {
        try {
          const frame = JSON.parse(data);
          if (frame.cmd === SEND_CHAT && frame.bdy?.msg) {
            sent.push({ tid: frame.tid, msg: frame.bdy.msg, cid: frame.cid });
            if (sent.length > MAX_PENDING_SENDS) sent.shift();
          }
        } catch {
          /* 무시 */
        }
        return originalSend(data);
      };
      // tid 로 짝짓고, ACK 에 tid 가 없으면 보낸 순서대로 꺼낸다.
      const takeSent = (tid) => {
        const i = tid == null ? -1 : sent.findIndex((s) => s.tid === tid);
        return i >= 0 ? sent.splice(i, 1)[0] : sent.shift();
      };
      // 닉네임은 어느 쪽에도 없다 — 본문만으로 짝짓도록 mine 으로 표시해 넘긴다.
      const ackEntries = (frame) => {
        const t = clockMs(frame.bdy?.ctime ?? frame.bdy?.msgTime);
        const item = t == null ? null : takeSent(frame.tid);
        return item
          ? [{ t, mode: "clock", mine: true, msg: String(item.msg), src: String(item.cid ?? "") }]
          : [];
      };
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        // 여기서 예외가 새어 나가면 페이지의 채팅이 통째로 멈춘다.
        try {
          const frame = JSON.parse(event.data);
          publish(frame.cmd === SEND_CHAT_ACK ? ackEntries(frame) : liveEntries(frame));
        } catch {
          /* 무시 */
        }
      });
      return socket;
    },
  });

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const response = originalFetch.apply(this, args);
    const url = String(args[0]?.url ?? args[0] ?? "");
    if (MAYBE_CHATS.test(url)) {
      response
        .then((res) => res.clone().json())
        .then((json) => publish(vodEntries(json)))
        .catch(() => {});
    }
    return response;
  };

  const { open, send } = XMLHttpRequest.prototype;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__czseChats = MAYBE_CHATS.test(String(url));
    return open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__czseChats) {
      this.addEventListener("load", () => {
        try {
          publish(
            vodEntries(
              this.responseType === "json" ? this.response : JSON.parse(this.responseText)
            )
          );
        } catch {
          /* 무시 */
        }
      });
    }
    return send.apply(this, args);
  };
})();
