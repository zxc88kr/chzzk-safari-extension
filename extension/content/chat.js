"use strict";

// 채팅 타임스탬프: 실제 작성 시각을 붙인다 (라이브는 시계 시각, 다시보기는 영상 시점).
// 시각은 chattime-loader.js 가 네트워크에서 받아 쌓아둔 히스토리를 lookup 으로 조회한다.
(() => {
  const CLASS = "czse-ts";
  // 치지직 채팅 아이템: webpack 클래스(live_chatting_list_item__)와
  // css-module 단축 해시(_item_...) 두 스킴 모두 대응
  const ITEM_SELECTOR = '[class*="live_chatting_list_item__"], [class*="_item_"]';
  const CHAT_SCOPE = '#aside-chatting, [class*="live_chatting"], [role="log"]';
  const NICKNAME_SELECTOR =
    '[class*="live_chatting_message_nickname__"], [class*="_nickname_"]';

  // 본문 텍스트 = 아이템 전체 텍스트에서 닉네임을 뺀 나머지.
  // 뱃지·이모티콘은 이미지라 텍스트에 안 잡히고, 우리 span 은 닉네임 안에 있어 같이 빠진다.
  const messageTextOf = (item, nicknameEl) => {
    const whole = item.textContent ?? "";
    const nickname = nicknameEl.textContent ?? "";
    return whole.startsWith(nickname) ? whole.slice(nickname.length) : whole;
  };

  const addSpan = (nicknameEl, found) => {
    const span = document.createElement("span");
    span.className = CLASS;
    span.textContent =
      found.mode === "offset"
        ? czse.util.timeOffset(found.t)
        : czse.util.timeHMS(new Date(found.t));
    nicknameEl.prepend(span);
  };

  // 화면의 채팅 전체를 아래(최신)에서 위로 훑으며, 같은 닉네임+본문의 몇 번째
  // 노드인지(occFromEnd)를 세어 히스토리의 같은 순번 항목과 짝짓는다.
  // 순수 조회라 몇 번을 다시 실행해도 같은 답이 나온다 — 치지직이 리스트를 통째로
  // 다시 그려 스탬프가 날아가도 다음 sweep 이 같은 값으로 복원한다(실측: 진입 시
  // 리스트를 한 번 그렸다가 갈아끼우고, WS 핸들러 안에서 동기 렌더해 노드가 항목보다
  // 먼저 생긴다. 어느 경우든 다음 sweep 이 수습한다).
  const sweep = () => {
    const chatTime = globalThis.czseChatTime;
    if (!chatTime) return;
    const scoped = [];
    for (const el of document.querySelectorAll(ITEM_SELECTOR)) {
      if (el.closest(CHAT_SCOPE)) scoped.push(el);
    }
    if (!scoped.length) return;
    // 문서 순서가 과거→최신이라고 가정하지 않는다 — 치지직 채팅은 최신-먼저
    // (column-reverse) 로 렌더될 수 있다(실측). 화면 좌표로 방향을 판별해
    // 최신→과거 순서로 맞춘다. 최신 쪽이 화면 아래(top 값이 큼)다.
    const newestFirst =
      scoped[0].getBoundingClientRect().top >
      scoped[scoped.length - 1].getBoundingClientRect().top;
    const items = newestFirst ? scoped : scoped.reverse();
    const limit = Math.min(items.length, 60);
    // 다시보기 컷오프: 히스토리엔 재생 위치보다 앞선(아직 안 그려진) 항목이 미리 와 있다
    const vod = location.pathname.startsWith("/video/");
    const video = czse.util.findVideo?.() ?? document.querySelector("video");
    const cutoff = vod && video && Number.isFinite(video.currentTime)
      ? video.currentTime * 1000 + 3000
      : null;
    const counts = new Map();
    for (let i = 0; i < limit; i++) {
      const item = items[i];
      // 닉네임 없는 아이템(시스템 공지 등)은 유저 채팅이 아니다 — 스탬프도 순번 계산도 제외
      const nickname = item.querySelector(NICKNAME_SELECTOR);
      if (!nickname) continue;
      const text = messageTextOf(item, nickname);
      const key = chatTime.key(
        nickname.textContent.replace(item.querySelector(`.${CLASS}`)?.textContent ?? "", "").trim(),
        text
      );
      const occ = counts.get(key) ?? 0;
      counts.set(key, occ + 1);
      if (item.querySelector(`.${CLASS}`)) continue; // 이미 찍힘 — 순번만 소진
      // 작성 시각을 모르는 줄(필터된 채팅의 자리 등)은 찍지 않는다. 렌더 시각으로
      // 대신하면 백로그가 전부 같은 값이 되고 다시보기는 현실 시각이 찍힌다.
      // 내가 방금 친 채팅만 예외 — broadcast 전이라 lookup 은 빈손이지만 전송 ACK 로
      // 서버 시각을 이미 알고 있다. 나중에 오는 broadcast 도 같은 값이다.
      const found =
        chatTime.lookup(key, occ, vod ? "offset" : "clock", cutoff) ??
        (vod ? null : chatTime.lookupMine(text));
      if (found) addSpan(nickname, found);
    }
  };

  // 노드 추가마다 sweep 을 돌리면 낭비라 태스크당 한 번으로 뭉친다.
  let sweepTimer = null;
  const scheduleSweep = () => {
    if (sweepTimer !== null) return;
    sweepTimer = setTimeout(() => {
      sweepTimer = null;
      sweep();
    }, 0);
  };

  const isChatItem = (el) =>
    el.matches(ITEM_SELECTOR) || el.parentElement?.getAttribute("role") === "log";

  // 시스템 공지(환영/필터링 안내 등) 숨김: 채팅 로그 안에서 닉네임 요소가 없는
  // 아이템은 유저 채팅이 아니므로 전부 숨긴다. 문구에 의존하지 않는 구조 기반 판별.
  // (닉네임을 포함하는 컨테이너는 querySelector 에 걸리므로 잘못 숨겨질 일이 없다)
  const hideIfNotice = (item) => {
    if (!item.closest('[role="log"], [class*="live_chatting_list_wrapper"]')) return;
    if (item.querySelector(NICKNAME_SELECTOR)) return;
    item.setAttribute("data-czse-hidden-notice", "");
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (!m.target.closest?.(CHAT_SCOPE)) continue;
      for (const node of m.addedNodes) {
        if (!(node instanceof Element) || !isChatItem(node)) continue;
        hideIfNotice(node);
        scheduleSweep();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 타임스탬프·시스템 공지 숨김을 각각 html 클래스로 반영 (CSS 가 표시 여부 결정).
  // 태깅(타임스탬프 span, data-czse-hidden-notice)은 설정과 무관하게 항상 붙이고
  // 표시 여부만 토글한다. 덕분에 도중에 켜도 이미 떠 있는 채팅에 소급 적용된다.
  const applyToggle = () => {
    const root = document.documentElement.classList;
    root.toggle("czse-ts-off", !czse.settings.chatTimestamp);
    root.toggle("czse-hide-notice", czse.settings.hideChatNotice);
  };
  czse.ready.then(() => {
    applyToggle();
    czse.listeners.add(applyToggle);
  });

  globalThis.czseChatTime?.onDeliver(scheduleSweep);
  sweep(); // document_idle 이전에 렌더돼 observer 가 못 본 백로그
})();
