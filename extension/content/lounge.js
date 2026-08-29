"use strict";

// 라운지(game.naver.com)의 차단 유저 게시글 숨김. 치지직과 도메인이 달라 별도로 붙는다.
//
// 라운지는 차단한 유저의 글을 지우지 않고 흐리게 남긴다 (실측 2026-08-29):
//   홈 위젯    LI._item_ > DIV._card_ _is_dimmed_
//   게시판     TR._board_detail_ > TD > DIV._board_content_ _is_dimmed_
(() => {
  const BLOCKED_TEXT = /차단한 유저/;
  const DIMMED = '[class*="_is_dimmed_"]';
  const ROW = "li, tr";

  // _is_dimmed_ 는 이름이 일반적이라 삭제·신고 등 다른 상태에도 쓰일 수 있다.
  // 클래스만 보고 숨기면 엉뚱한 글까지 사라지므로 안내 문구까지 확인한다.
  //
  // 태깅은 설정과 무관하게 항상 한다. 숨김 여부는 content.css 가 <html> 클래스로
  // 결정하므로, 도중에 켜도 이미 그려진 글에 소급 적용된다.
  const tagBlockedPosts = () => {
    for (const el of document.querySelectorAll(DIMMED)) {
      if (el.closest("[data-czse-blocked-post]")) continue;
      if (!BLOCKED_TEXT.test(el.textContent ?? "")) continue;
      (el.closest(ROW) ?? el).setAttribute("data-czse-blocked-post", "1");
    }
  };

  const applyFlag = () => {
    document.documentElement.classList.toggle(
      "czse-hide-blocked",
      !!czse.settings.hideBlocked
    );
  };

  // 라운지는 SPA 라 목록이 통째로 갈아끼워진다. 노드 추가마다 훑으면 낭비라
  // 태스크당 한 번으로 뭉친다.
  let sweepTimer = null;
  const scheduleSweep = () => {
    if (sweepTimer !== null) return;
    sweepTimer = setTimeout(() => {
      sweepTimer = null;
      tagBlockedPosts();
    }, 0);
  };

  czse.ready.then(() => {
    applyFlag();
    czse.listeners.add(applyFlag);
    tagBlockedPosts();
  });

  new MutationObserver(scheduleSweep).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
