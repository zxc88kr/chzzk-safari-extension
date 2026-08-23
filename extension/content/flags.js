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

  // CSS 만으로 특정할 수 없는 영역은 JS 가 의미 기반으로 찾아 태깅하고,
  // 숨김 자체는 content.css 가 태그 + html 클래스 조합으로 처리한다.
  // (클래스명 해시에 의존하지 않아 치지직 리빌드에 강하다)

  // 사이드바 추천/파트너 섹션: 헤더 텍스트로 판별
  const tagSidebarSections = () => {
    const sidebar = document.getElementById("sidebar");
    for (const nav of sidebar?.querySelectorAll("nav") ?? []) {
      if (nav.hasAttribute("data-czse-rec-section")) continue;
      const header = nav.querySelector('[class*="header"]')?.textContent ?? "";
      if (/추천|파트너/.test(header)) nav.setAttribute("data-czse-rec-section", "1");
    }
  };

  // 홈 추천 라이브: 홈 화면 본문에서 <video> 를 포함하는 상단 블록을 구조로 판별.
  // video 에서 조상으로 올라가되, 방송 목록까지 포함하는 조상(라이브 링크가 많은
  // 컨테이너)을 만나면 그 직전에서 멈춘다.
  const tagHomeRecommend = () => {
    if (location.pathname !== "/") return;
    const main = document.querySelector("main") ?? document.body;
    const video = main.querySelector("video");
    if (!video || video.closest("[data-czse-home-rec]")) return;
    let chosen = video;
    let el = video.parentElement;
    while (el && el !== main && el !== document.body) {
      if (el.querySelectorAll('a[href^="/live/"]').length > 12) break;
      chosen = el;
      el = el.parentElement;
    }
    chosen.setAttribute("data-czse-home-rec", "1");
  };

  setInterval(async () => {
    await czse.ready;
    if (czse.settings.hideRecommended) tagSidebarSections();
    if (czse.settings.hideRecommendedLive) tagHomeRecommend();
  }, 2000);
})();
