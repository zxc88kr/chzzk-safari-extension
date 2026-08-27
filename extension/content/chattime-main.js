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
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        // 여기서 예외가 새어 나가면 페이지의 채팅이 통째로 멈춘다.
        try {
          publish(liveEntries(JSON.parse(event.data)));
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
