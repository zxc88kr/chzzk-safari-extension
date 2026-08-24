"use strict";

// 사이드바 자동 갱신: 팔로잉 라이브 API 를 직접 폴링해, 팔로잉 섹션에 이미 있는
// 채널의 라이브 표시(프로필 둘레 초록 링)를 켜고 끈다.
// (치지직 내부 React 에 의존하던 방식은 리빌드로 깨져서 API + DOM 직접 갱신으로 전환)
//
// 새로 방송을 켠 채널을 목록에 끼워넣는 복제 삽입은 하지 않는다 — 채널명이 보이는
// 넓은 사이드바에서 구조가 달라 이름 없는 빈 항목이 쌓였다. 새 라이브 채널은
// 치지직의 자체 목록 갱신에 맡긴다.
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
          title: f.liveInfo?.liveTitle ?? "",
          viewers: f.liveInfo?.concurrentUserCount,
        },
      ])
    );

    const section = findFollowingSection();
    if (!section) return;

    // 이전 버전의 복제 삽입이 남긴 항목이 있으면 정리한다 (기능은 폐지됨).
    for (const el of section.querySelectorAll("[data-czse-added]")) {
      (el.closest("li") ?? el).remove();
    }

    const nativeLiveClass = findNativeLiveClass(section);
    for (const a of section.querySelectorAll('a[href^="/live/"]')) {
      const id = czse.util.channelIdFromHref(a);
      if (!id) continue;
      const container = a.parentElement;
      // 프로필(아바타) 요소를 정확히 찾은 경우에만 라이브 링을 붙인다. 못 찾으면
      // 엉뚱한 요소(텍스트 래퍼)에 붙어 초록 타원처럼 레이아웃이 깨지므로 건너뛴다.
      const profile = container?.querySelector('[class*="_profile_"]');
      const info = liveMap.get(id);

      if (info) {
        container?.setAttribute("data-czse-live", "");
        if (profile && nativeLiveClass && !profile.className.includes("_is_live_")) {
          profile.classList.add(nativeLiveClass);
        }
        a.title = tooltip(info);
      } else {
        container?.removeAttribute("data-czse-live");
        if (profile) {
          for (const cls of [...profile.classList]) {
            if (cls.startsWith("_is_live_")) profile.classList.remove(cls);
          }
        }
        a.removeAttribute("title");
      }
    }
  };

  czse.util.poll(tick, REFRESH_INTERVAL);
})();
