"use strict";

// 사이드바 자동 갱신: 팔로잉 라이브 API 를 직접 폴링해 사이드바를 갱신한다.
// (치지직 내부 React 에 의존하던 방식은 리빌드로 깨져서 API + DOM 직접 갱신으로 전환)
//
// 사이드바 구조 (축소형 기준):
//   nav._section_* > ul._list_* > li._item_* > div._item_*._type_profile_* >
//     div._profile_* (라이브면 _is_live_* 클래스) > img + span.blind
//     a._item_link_* (오버레이 링크, href=/live/{channelId})
(() => {
  const REFRESH_INTERVAL = 30 * 1000;

  // 팔로잉 섹션만 갱신 대상 (추천/파트너 섹션의 /live/ 링크를 건드리지 않도록)
  const findFollowingSection = () => {
    const navs = czse.util.sidebarNavs();
    return (
      navs.find((nav) => /팔로잉|팔로우/.test(czse.util.navHeaderText(nav))) ?? navs[0]
    );
  };

  // 치지직 네이티브 라이브 표시 클래스(_is_live_해시)를 기존 라이브 항목에서 추출
  const findNativeLiveClass = (section) => {
    const el = section.querySelector('[class*="_is_live_"]');
    return el?.className.match(/_is_live_\w+/)?.[0] ?? null;
  };

  const tooltip = (info) =>
    [info.name, info.title, czse.util.formatViewers(info.viewers)]
      .filter(Boolean)
      .join(" · ");

  const tick = async () => {
    if (!czse.settings.sidebarRefresh) return;
    if (!document.getElementById("sidebar")) return;

    const content = await czse.util.fetchApi([
      "/service/v1/channels/followings/live?page=0&size=50",
    ]);
    const list = content?.followingList;
    if (!Array.isArray(list)) return; // API 실패 시 아무것도 건드리지 않는다

    const liveMap = new Map(
      list.map((f) => [
        f.channelId,
        {
          name: f.channel?.channelName ?? "",
          image: f.channel?.channelImageUrl ?? "",
          title: f.liveInfo?.liveTitle ?? "",
          viewers: f.liveInfo?.concurrentUserCount,
        },
      ])
    );

    const section = findFollowingSection();
    if (!section) return;
    const nativeLiveClass = findNativeLiveClass(section);

    const seen = new Set();
    for (const a of section.querySelectorAll('a[href^="/live/"]')) {
      const id = czse.util.channelIdFromHref(a);
      if (!id) continue;
      seen.add(id);
      const container = a.parentElement;
      const profile =
        container?.querySelector('[class*="_profile_"]') ||
        container?.firstElementChild;
      const info = liveMap.get(id);

      if (info) {
        container?.setAttribute("data-czse-live", "");
        if (profile && nativeLiveClass && !profile.className.includes("_is_live_")) {
          profile.classList.add(nativeLiveClass);
        }
        a.title = tooltip(info);
      } else {
        // 방송 종료: 우리가 추가한 항목은 제거, 네이티브 항목은 라이브 표시만 해제
        if (container?.hasAttribute("data-czse-added")) {
          (a.closest("li") ?? container).remove();
          continue;
        }
        container?.removeAttribute("data-czse-live");
        if (profile) {
          for (const cls of [...profile.classList]) {
            if (cls.startsWith("_is_live_")) profile.classList.remove(cls);
          }
        }
        a.removeAttribute("title");
      }
    }

    // 새로 방송을 켠 팔로우 채널: 기존 항목을 복제해 목록 맨 위에 추가
    const templateLi = section.querySelector('a[href^="/live/"]')?.closest("li");
    const listEl = templateLi?.parentElement;
    if (!templateLi || !listEl) return;
    for (const [id, info] of liveMap) {
      if (seen.has(id)) continue;
      const li = templateLi.cloneNode(true);
      const a = li.querySelector('a[href^="/live/"]');
      const img = li.querySelector("img");
      if (!a || !img) continue;
      a.setAttribute("href", `/live/${id}`);
      a.title = tooltip(info);
      if (info.image) img.src = `${info.image}?type=f120_120_na`;
      const container = a.parentElement;
      container?.setAttribute("data-czse-live", "");
      container?.setAttribute("data-czse-added", "");
      listEl.prepend(li);
    }
  };

  czse.util.poll(tick, REFRESH_INTERVAL);
})();
