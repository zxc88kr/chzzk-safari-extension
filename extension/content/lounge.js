"use strict";

// 치지직 라운지(네이버 게임)의 차단 유저 게시글 숨김.
// 라운지는 chzzk.naver.com 이 아니라 game.naver.com 이라, 치지직용 content script
// 묶음과 별도로 이 파일만 붙는다 (manifest 의 두 번째 document_idle 항목).
//
// 라운지는 차단한 유저의 글을 지우지 않고 흐리게 남긴다 (실측 2026-08-29):
//   라운지 홈    LI._item_ > DIV._card_ _is_dimmed_ > … "차단한 유저의 게시글 입니다."
//   게시판 목록  TR._board_detail_ > TD > DIV._board_content_ _is_dimmed_ > … (같은 문구)
//
// _is_dimmed_ 는 이름이 일반적이라 삭제·신고 등 다른 상태에도 쓰일 수 있다.
// 클래스만 믿지 않고 안내 문구까지 확인한 뒤 태깅한다.
(() => {
  const BLOCKED_TEXT = /차단한 유저/;
  const DIMMED = '[class*="_is_dimmed_"]';
  // 목록의 한 줄. 홈 위젯은 li, 게시판은 tr 이라 둘 다 본다.
  const ROW = "li, tr";

  // 태깅은 설정과 무관하게 항상 한다. 숨김 여부는 content.css 가 <html> 클래스로
  // 결정하므로, 도중에 설정을 켜도 이미 그려진 글에 소급 적용된다.
  const tagBlockedPosts = () => {
    for (const el of document.querySelectorAll(DIMMED)) {
      if (!BLOCKED_TEXT.test(el.textContent ?? "")) continue;
      const row = el.closest(ROW) ?? el;
      row.setAttribute("data-czse-blocked-post", "1");
    }
  };

  const applyFlag = () => {
    document.documentElement.classList.toggle(
      "czse-hide-blocked",
      !!czse.settings.hideBlocked
    );
  };

  // 라운지는 SPA 라 목록이 통째로 갈아끼워진다. 노드 추가마다 훑으면 낭비라
  // 태스크당 한 번으로 뭉친다 (chat.js 와 같은 방식).
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
