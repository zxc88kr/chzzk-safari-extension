"use strict";

// 정적 로고: 설정에 따라 html 클래스만 토글하고, 실제 교체는 content.css 가 담당.
(() => {
  const apply = () =>
    document.documentElement.classList.toggle(
      "czse-static-logo",
      !!czse.settings.staticLogo
    );
  czse.ready.then(() => {
    apply();
    czse.listeners.add(apply);
  });
})();
