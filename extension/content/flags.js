"use strict";

// 설정 → <html> 클래스 토글. 실제 스타일 적용은 content.css 가 담당한다.
(() => {
  const FLAGS = {
    staticLogo: "czse-static-logo",
    hideBlocked: "czse-hide-blocked",
    hideRecommended: "czse-hide-recommended",
    hideOffline: "czse-hide-offline",
    hideSidebarCategory: "czse-hide-category",
    hideSidebarSchedule: "czse-hide-schedule",
    hidePromo: "czse-hide-promo",
    hideRanking: "czse-hide-ranking",
  };

  const apply = () => {
    for (const [key, cls] of Object.entries(FLAGS)) {
      document.documentElement.classList.toggle(cls, !!czse.settings[key]);
    }
  };

  czse.ready.then(() => {
    apply();
    czse.listeners.add(apply);
  });

  // CSS 만으로 특정할 수 없는 영역은 JS 가 의미 기반으로 찾아 태깅하고,
  // 숨김 자체는 content.css 가 태그 + html 클래스 조합으로 처리한다.
  // (클래스명 해시에 의존하지 않아 치지직 리빌드에 강하다)

  // 사이드바 섹션: 헤더 텍스트로 종류를 판별해 태깅 (숨김 여부는 CSS 가 결정)
  const SECTION_TYPES = [
    { type: "rec", pattern: /추천|파트너/ },
    { type: "category", pattern: /카테고리/ },
    { type: "schedule", pattern: /일정/ },
  ];
  const tagSidebarSections = () => {
    for (const nav of czse.util.sidebarNavs()) {
      if (nav.hasAttribute("data-czse-section")) continue;
      const header = czse.util.navHeaderText(nav);
      const match = SECTION_TYPES.find(({ pattern }) => pattern.test(header));
      if (match) nav.setAttribute("data-czse-section", match.type);
    }
  };

  // 프로모션 배너(치즈팜 등): 이미지 alt / aria-label / 짧은 링크 텍스트로 판별.
  // 배너의 클래스명이 아니라 내용으로 찾으므로 리빌드에 강하다.
  const PROMO_PATTERN = /치즈팜/;
  const tagPromoBanners = () => {
    for (const el of document.querySelectorAll("img[alt], [aria-label]")) {
      const text = el.getAttribute("alt") ?? el.getAttribute("aria-label") ?? "";
      if (!PROMO_PATTERN.test(text)) continue;
      (el.closest("nav, li, aside") ?? el.closest("a, div") ?? el).setAttribute(
        "data-czse-promo",
        "1"
      );
    }
    for (const a of document.querySelectorAll("a")) {
      const text = a.textContent.trim();
      if (text.length > 30 || !PROMO_PATTERN.test(text)) continue;
      (a.closest("nav, li") ?? a).setAttribute("data-czse-promo", "1");
    }
  };

  // 채팅창 랭킹(라이브·주간 후원·통나무) 블록을 태깅한다.
  // CSS 만으로는 잡기 어렵다 — 랭킹 요소가 컨테이너의 손자라 :has(> …) 로는 안 걸리고,
  // > 를 빼면 채팅창 전체가 매칭돼 통째로 사라진다. 그래서 JS 로 바깥 컨테이너를 특정한다.
  const tagRankingBlocks = () => {
    const aside = czse.util.chatAside();
    if (!aside) return;

    for (const el of aside.querySelectorAll('[class*="_ranking_"]')) {
      if (el.closest("[data-czse-ranking]")) continue; // 이미 처리된 블록 안

      // 채팅 영역 바로 아래까지 올라가며 가장 바깥 컨테이너를 찾는다
      let container = el;
      for (let node = el; node && node !== aside; node = node.parentElement) {
        if (/_container_/.test(node.className ?? "")) container = node;
      }

      // 채팅 로그나 입력창까지 품었다면 너무 큰 것을 잡은 것 — 건드리지 않는다
      if (container.querySelector('[role="log"], [contenteditable="true"]')) continue;

      container.setAttribute("data-czse-ranking", "1");
    }
  };

  czse.util.poll(() => {
    tagSidebarSections();
    if (czse.settings.hidePromo) tagPromoBanners();
    if (czse.settings.hideRanking) tagRankingBlocks();
  }, 2000);
})();
