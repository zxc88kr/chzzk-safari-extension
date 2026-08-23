// MAIN world (페이지 컨텍스트) 스크립트.
// 사이드바 갱신: 치지직 사이드바 컴포넌트의 데이터 리페치 effect 를 React fiber 에서
// 찾아 다시 실행한다. (cheese-knife 의 updateSidebar 와 같은 접근)
(() => {
  "use strict";
  if (window.__czseMain) return; // manifest 주입 + 폴백 주입 중복 방지
  window.__czseMain = true;
  document.documentElement.dataset.czseMain = "1";

  const getReactFiber = (node) =>
    node &&
    Object.entries(node).find(([key]) => key.startsWith("__reactFiber$"))?.[1];

  // node 의 상위 fiber 를 거슬러 올라가며 criteria 를 만족하는 hook state 를 찾는다
  const findReactState = (node, criteria) => {
    let fiber = getReactFiber(node);
    if (!fiber) return null;
    fiber = fiber.return;
    while (fiber) {
      let state = fiber.memoizedState;
      while (state) {
        const value = state.memoizedState;
        if (value != null && criteria(value)) return value;
        state = state.next;
      }
      fiber = fiber.return;
    }
    return null;
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.type !== "czse:refresh-sidebar") return;
    try {
      const sidebar =
        document.getElementById("sidebar") ||
        document.querySelector("aside:has(nav)");
      const section =
        sidebar?.querySelector('[class^="navigation_bar_header__"]')?.parentNode ||
        sidebar?.querySelector("nav");
      if (!section) return;
      // 팔로잉 목록을 리페치하는 useEffect: tag 8(HasEffect|Passive), deps 2개
      const effect = findReactState(
        section,
        (s) => s.tag === 8 && s.destroy == null && s.deps?.length === 2
      );
      effect?.create?.();
    } catch {
      /* 치지직 리빌드로 구조가 바뀌면 조용히 실패 */
    }
  });
})();
