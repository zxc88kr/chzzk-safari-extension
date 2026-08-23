"use strict";

// 방송 호버 미리보기: /live/{id} 링크에 마우스를 올리면 HLS 미리보기 카드를 띄운다.
// Safari 는 <video> 가 HLS(m3u8)를 네이티브 재생하므로 별도 플레이어가 필요 없다.
(() => {
  const CACHE_TTL = 60 * 1000;

  let hoverAnchor = null;
  let timer = null;
  let card = null;
  const cache = new Map(); // channelId -> { info, at }

  const getLiveDetail = async (channelId) => {
    const hit = cache.get(channelId);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.info;
    const info = await czse.util.fetchApi([
      `/service/v3.3/channels/${channelId}/live-detail`,
      `/service/v2/channels/${channelId}/live-detail`,
    ]);
    if (info) {
      try {
        info.livePlayback = JSON.parse(info.livePlaybackJson);
      } catch {
        /* 성인 방송 등 재생 정보 없음 */
      }
    }
    cache.set(channelId, { info, at: Date.now() });
    return info;
  };

  const streamUrl = (info) => {
    const media = info?.livePlayback?.media;
    if (!Array.isArray(media)) return null;
    const pick =
      media.find((m) => m.mediaId === "HLS") ||
      media.find((m) => m.mediaId === "LLHLS") ||
      media[0];
    return pick?.path || null;
  };

  const removeCard = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    card?.remove();
    card = null;
    hoverAnchor = null;
  };

  const position = (anchor) => {
    const rect = anchor.getBoundingClientRect();
    const width = Number(czse.settings.previewWidth) || 400;
    const height = (width * 9) / 16 + 56; // 영상 + 메타 영역
    card.style.width = `${width}px`;

    let left;
    let top;
    if (rect.width < 240) {
      // 사이드바 아이템: 오른쪽에 붙인다
      left = rect.right + 10;
      top = rect.top + rect.height / 2 - height / 2;
    } else {
      // 그리드 카드: 카드 위에 중앙 정렬
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.top + rect.height / 2 - height / 2;
    }
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    top = Math.min(Math.max(8, top), window.innerHeight - height - 8);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  };

  const buildCard = (anchor, info) => {
    card = document.createElement("div");
    card.className = "czse-preview";

    const url = info.status === "OPEN" ? streamUrl(info) : null;
    if (url) {
      const video = document.createElement("video");
      const volume = Math.min(100, Math.max(0, Number(czse.settings.previewVolume) || 0));
      video.muted = volume === 0;
      video.volume = volume / 100;
      video.playsInline = true;
      video.src = url;
      card.appendChild(video);
      // 소리 있는 자동재생이 차단되면 음소거로 폴백
      // (소리를 내려면 Safari 사이트 설정에서 chzzk 자동 재생 허용 필요)
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    } else {
      const img = document.createElement("img");
      img.src = (info.liveImageUrl || "").replace("{type}", "480");
      img.alt = "";
      card.appendChild(img);
    }

    const meta = document.createElement("div");
    meta.className = "czse-preview-meta";
    const title = document.createElement("div");
    title.className = "czse-preview-title";
    title.textContent = info.liveTitle || "";
    const line = document.createElement("div");
    line.className = "czse-preview-info";
    line.textContent = [
      info.channel?.channelName,
      info.status === "OPEN"
        ? czse.util.formatViewers(info.concurrentUserCount)
        : "오프라인",
    ]
      .filter(Boolean)
      .join(" · ");
    meta.append(title, line);
    card.appendChild(meta);

    position(anchor);
    document.body.appendChild(card);
  };

  document.addEventListener("mouseover", (e) => {
    if (!czse.settings?.hoverPreview) return;
    const anchor = e.target.closest?.('a[href^="/live/"]');
    if (!anchor || anchor === hoverAnchor) return;
    removeCard();
    hoverAnchor = anchor;
    timer = setTimeout(async () => {
      const channelId = czse.util.channelIdFromPath(new URL(anchor.href).pathname);
      if (!channelId) return;
      if (channelId === czse.util.channelIdFromPath()) return; // 지금 보는 방송은 제외
      const info = await getLiveDetail(channelId);
      if (!info || hoverAnchor !== anchor || card) return;
      buildCard(anchor, info);
    }, Math.max(100, (Number(czse.settings.previewDelay) || 0.5) * 1000));
  });

  document.addEventListener("mouseout", (e) => {
    if (!hoverAnchor) return;
    const to = e.relatedTarget;
    if (to && hoverAnchor.contains(to)) return;
    if (e.target === hoverAnchor || hoverAnchor.contains(e.target)) removeCard();
  });

  document.addEventListener("click", removeCard, true);
  window.addEventListener("scroll", removeCard, { capture: true, passive: true });
})();
