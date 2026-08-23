"use strict";

// 채널 홈 탭(홈/동영상/클립/커뮤니티/정보) 끝에 "채팅" 탭을 추가한다.
// 오프라인 채널이어도 /live/{id} 로 들어가 채팅을 볼 수 있게 하는 cheese-knife 의
// 채널 채팅 기능과 같은 접근. SPA 라우팅 대응을 위해 주기적으로 존재를 확인한다.
(() => {
  const CLASS = "czse-chat-tab";

  const channelIdFromChannelPage = () =>
    location.pathname.match(/^\/([0-9a-f]{32})(\/|$)/)?.[1] ?? null;

  const findTabList = () => {
    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) return tablist;
    // 폴백: "정보" 탭이 들어 있는 링크/버튼 목록의 부모
    for (const el of document.querySelectorAll("a, button")) {
      if (el.textContent.trim() === "정보") return el.closest("ul, nav, div");
    }
    return null;
  };

  const replaceText = (root, text) => {
    // 복제한 탭에서 가장 깊은 텍스트 노드를 찾아 교체
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent.trim()) {
        node.textContent = text;
        return true;
      }
      node = walker.nextNode();
    }
    root.textContent = text;
    return true;
  };

  setInterval(async () => {
    await czse.ready;
    const existing = document.querySelector(`.${CLASS}`);
    const channelId = czse.settings.channelChatTab ? channelIdFromChannelPage() : null;
    if (!channelId) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const list = findTabList();
    const template = list?.lastElementChild;
    if (!template) return;

    const tab = template.cloneNode(true);
    tab.classList.add(CLASS);
    tab.removeAttribute("aria-selected");
    replaceText(tab, "채팅");
    // 복제 노드에는 React 리스너가 없으므로 직접 이동시킨다
    tab.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.href = `/live/${channelId}`;
      },
      true
    );
    for (const a of tab.matches("a") ? [tab] : tab.querySelectorAll("a")) {
      a.setAttribute("href", `/live/${channelId}`);
    }
    list.appendChild(tab);
  }, 1000);
})();
