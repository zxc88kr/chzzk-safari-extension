"use strict";

// 채팅 타임스탬프: 새로 도착하는 채팅에 수신 시각을 붙인다.
// (기존 백로그 채팅은 실제 작성 시각을 알 수 없어 표기하지 않음)
(() => {
  const CLASS = "czse-ts";
  // 치지직 채팅 아이템: webpack 클래스(live_chatting_list_item__)와
  // css-module 단축 해시(_item_...) 두 스킴 모두 대응
  const ITEM_SELECTOR = '[class*="live_chatting_list_item__"], [class*="_item_"]';
  const CHAT_SCOPE = '#aside-chatting, [class*="live_chatting"], [role="log"]';

  const stamp = (item) => {
    if (item.querySelector(`.${CLASS}`)) return;
    const span = document.createElement("span");
    span.className = CLASS;
    span.textContent = czse.util.timeHMS(new Date());
    const nickname = item.querySelector(
      '[class*="live_chatting_message_nickname__"], [class*="_nickname_"]'
    );
    (nickname || item).prepend(span);
  };

  const isChatItem = (el) =>
    el.matches(ITEM_SELECTOR) || el.parentElement?.getAttribute("role") === "log";

  const observer = new MutationObserver((mutations) => {
    if (!czse.settings?.chatTimestamp) return;
    for (const m of mutations) {
      if (!m.target.closest?.(CHAT_SCOPE)) continue;
      for (const node of m.addedNodes) {
        if (node instanceof Element && isChatItem(node)) stamp(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 토글 오프 시 이미 찍힌 타임스탬프는 CSS 로 숨긴다
  const applyToggle = () =>
    document.documentElement.classList.toggle("czse-ts-off", !czse.settings.chatTimestamp);
  czse.ready.then(() => {
    applyToggle();
    czse.listeners.add(applyToggle);
  });
})();
