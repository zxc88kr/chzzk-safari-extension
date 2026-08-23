"use strict";

// 설정 기본값. content script(settings.js)와 popup(popup.js)이 공유한다.
const CZSE_DEFAULTS = {
  // 플레이어
  latencyDisplay: true, // 지연시간 칩 표시 (클릭: 1.5배속 따라잡기, Shift+클릭: 라이브 지점 이동)
  arrowSeek: true, // ←/→ 방향키 탐색
  seekStep: 5, // 방향키 이동 간격(초)

  // 채팅
  chatTimestamp: true, // 채팅 타임스탬프

  // 화면
  staticLogo: true, // 좌상단 로고 애니메이션을 정적 로고로 교체

  // 탐색
  hoverPreview: true, // 방송 카드/사이드바 호버 미리보기
  previewDelay: 0.5, // 미리보기 뜨기까지 지연(초)
  previewWidth: 400, // 미리보기 카드 폭(px)
  sidebarRefresh: true, // 사이드바 30초마다 자동 갱신
  autoReload: true, // 오프라인 채널 방송 시작 시 자동 새로고침
};
