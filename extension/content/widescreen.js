"use strict";

// 자동 넓은 화면: 라이브 진입 시 넓은 화면(시어터 모드) 버튼을 한 번 눌러준다.
// 페이지(경로)당 1회만 시도해서, 사용자가 직접 되돌린 걸 다시 누르지 않는다.
(() => {
  let appliedPath = null;

  czse.util.poll(() => {
    if (!czse.settings.autoWide) return;
    if (!czse.util.isLivePage()) {
      appliedPath = null;
      return;
    }
    if (appliedPath === location.pathname) return;

    const button = document.querySelector(
      '.pzp-pc-viewmode-button, button[class*="viewmode"]'
    );
    if (!button) return; // 플레이어 로딩 전 — 다음 틱에 재시도

    appliedPath = location.pathname;
    const label = button.getAttribute("aria-label") || button.textContent || "";
    // aria-label 은 "누르면 하게 될 동작"을 설명하므로, "넓은 화면"일 때만 누른다
    if (label.includes("넓은")) button.click();
  }, 1000);
})();
