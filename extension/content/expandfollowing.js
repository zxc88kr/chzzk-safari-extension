"use strict";

// 사이드바 팔로잉 목록 자동 펼치기.
// 팔로잉 섹션은 기본 5개만 보이고 "더보기" 버튼으로 전체를 펼친다.
// 진입 시 "더보기"가 있으면 1회 자동 클릭한다.
//
// 사용자가 수동으로 접으면 "더보기"가 다시 나타나지만, 우리가 이미 펼친
// 섹션에는 표식(data-czse-expanded)을 남겨 재클릭하지 않는다 — 사용자 의도 존중.
// 다른 페이지로 이동해 팔로잉 섹션이 새로 그려지면 표식이 없어 다시 1회 펼친다.
(() => {
  const findFollowingSection = () => {
    const navs = czse.util.sidebarNavs();
    return navs.find((nav) => /팔로잉|팔로우/.test(czse.util.navHeaderText(nav))) ?? null;
  };

  // aria-label(없으면 텍스트)이 정확히 "더보기"인 버튼만. 새로고침·접기 버튼과 구분된다.
  const findMoreButton = (section) =>
    [...section.querySelectorAll("button")].find(
      (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === "더보기"
    ) ?? null;

  czse.util.poll(() => {
    if (!czse.settings.expandFollowing) return;
    const section = findFollowingSection();
    if (!section || section.hasAttribute("data-czse-expanded")) return;
    const more = findMoreButton(section);
    if (!more) return;
    section.setAttribute("data-czse-expanded", "");
    more.click();
  }, 1000);
})();
