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
    const sidebar = document.getElementById("sidebar");
    for (const nav of sidebar?.querySelectorAll("nav") ?? []) {
      if (nav.hasAttribute("data-czse-section")) continue;
      const header = nav.querySelector('[class*="header"]')?.textContent ?? "";
      const match = SECTION_TYPES.find(({ pattern }) => pattern.test(header));
      if (match) nav.setAttribute("data-czse-section", match.type);
    }
  };

  setInterval(async () => {
    await czse.ready;
    tagSidebarSections();
  }, 2000);
})();
