"use strict";

// 블라인드 채팅 원문 보기.
//
// 치지직은 메시지를 먼저 보내고 블라인드는 나중에 별도 이벤트로 알린다.
// 즉 원문은 이미 화면에 한 번 그려진 뒤 가려지는 것이므로, 도착 시점에
// 본문을 요소에 적어두었다가 가려질 때 되돌리면 된다.
// (cheese-knife 는 webpack 내부 chatController 를 후킹하지만, 치지직 리빌드로
//  내부 접근이 막혀 DOM 만으로 같은 원리를 구현한다)
//
// 한계: 내가 보기 전에 이미 블라인드된 메시지는 원문이 오지 않아 복원할 수 없다.
(() => {
  const TEXT_ATTR = "data-czse-original";
  const DONE_ATTR = "data-czse-revealed";

  // 블라인드된 메시지에 붙는 클래스 (webpack·css-module 두 스킴 대응)
  const isBlinded = (el) =>
    /_is_hidden_|live_chatting_message_is_hidden__|_blind/i.test(el.className ?? "");

  const contentOf = (item) =>
    item.querySelector(
      '[class*="live_chatting_message_text__"], [class*="_message_text_"], [class*="_text_"]'
    );

  // 도착한 메시지의 본문을 기억해 둔다
  const remember = (item) => {
    if (item.hasAttribute(TEXT_ATTR) || isBlinded(item)) return;
    const content = contentOf(item);
    const text = content?.textContent?.trim();
    if (text) item.setAttribute(TEXT_ATTR, text);
  };

  // 가려진 메시지를 기억해 둔 원문으로 되돌린다
  const reveal = (item) => {
    if (item.hasAttribute(DONE_ATTR)) return;
    const original = item.getAttribute(TEXT_ATTR);
    if (!original) return; // 원문을 못 받은 메시지 — 건드리지 않는다
    const content = contentOf(item);
    if (!content) return;
    content.textContent = original;
    item.setAttribute(DONE_ATTR, "");
  };

  const scan = (root) => {
    if (!(root instanceof Element)) return;
    const items = root.matches?.('[class*="_item_"], [class*="live_chatting_list_item__"]')
      ? [root]
      : [...root.querySelectorAll('[class*="_item_"], [class*="live_chatting_list_item__"]')];
    for (const item of items) {
      if (!item.closest('[role="log"]')) continue;
      remember(item);
      if (czse.settings.revealBlind && isBlinded(item)) reveal(item);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes") {
        const el = m.target;
        if (!(el instanceof Element) || !el.closest('[role="log"]')) continue;
        if (czse.settings.revealBlind && isBlinded(el)) reveal(el);
        continue;
      }
      for (const node of m.addedNodes) scan(node);
    }
  });

  czse.ready.then(() => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    // 설정을 켠 직후 이미 화면에 있는 메시지도 처리
    czse.listeners.add(() => {
      if (czse.settings.revealBlind) scan(document.body);
    });
  });
})();
