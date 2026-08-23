"use strict";

// 설정 → <html> 클래스 토글. 실제 스타일 적용은 content.css 가 담당한다.
(() => {
  const FLAGS = {
    staticLogo: "czse-static-logo",
    hideBlocked: "czse-hide-blocked",
    hideRecommended: "czse-hide-recommended",
    hideOffline: "czse-hide-offline",
    hideRecommendedLive: "czse-hide-rec-live",
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

  // 사이드바 "추천" 섹션은 CSS 텍스트 매칭이 불가능하므로 JS 로 태깅한다
  setInterval(async () => {
    await czse.ready;
    if (!czse.settings.hideRecommended) return;
    const sidebar = document.getElementById("sidebar");
    for (const nav of sidebar?.querySelectorAll("nav") ?? []) {
      if (nav.hasAttribute("data-czse-rec-section")) continue;
      const header = nav.querySelector('[class*="header"]')?.textContent ?? "";
      if (/추천|파트너/.test(header)) nav.setAttribute("data-czse-rec-section", "1");
    }
  }, 5000);
})();
