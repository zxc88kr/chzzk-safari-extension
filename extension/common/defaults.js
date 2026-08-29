"use strict";

// 설정 기본값. content script(settings.js)와 popup(popup.js)이 공유한다.
const CZSE_DEFAULTS = {
  // 플레이어
  latencyDisplay: true, // 지연시간 칩 표시 (클릭: 1.5배속 따라잡기, Shift+클릭: 라이브 지점 이동)
  arrowSeek: true, // ←/→ 방향키 탐색
  seekStep: 5, // 방향키 이동 간격(초)
  maxQuality: false, // 라이브·다시보기에서 가능한 최고 화질 유지
  autoWide: false, // 라이브 진입 시 자동 넓은 화면
  autoLumber: false, // 통나무(파워) 자동 획득
  autoUnmute: false, // 라이브 진입 시 자동 음소거 해제
  pipButton: true, // 플레이어에 PIP 버튼 추가
  captureButton: true, // 플레이어에 화면 캡처 버튼 추가

  // 채팅
  chatTimestamp: false, // 채팅 타임스탬프
  chatMacros: false, // 자주 쓰는 문구 버튼
  hideRanking: false, // 채팅창 후원·통나무 랭킹 숨기기
  hideChatNotice: false, // 입장·필터링 안내 등 채팅 시스템 공지 숨기기

  // 화면
  staticLogo: true, // 좌상단 로고 애니메이션을 정적 로고로 교체
  hideBlocked: false, // 차단한 유저의 방송 카드·라운지 글 숨기기
  hideRecommended: false, // 사이드바 추천·파트너 섹션 숨기기
  hideSidebarCategory: false, // 사이드바 인기 카테고리 숨기기
  hideSidebarSchedule: false, // 사이드바 방송 일정 숨기기
  hideOffline: false, // 사이드바 오프라인 채널 숨기기
  hidePromo: false, // 치즈팜 등 프로모션 배너 숨기기

  // 탐색
  hoverPreview: true, // 방송 카드/사이드바 호버 미리보기
  previewDelay: 0.5, // 미리보기 뜨기까지 지연(초)
  previewWidth: 400, // 미리보기 카드 폭(px)
  previewVolume: 20, // 미리보기 볼륨(%) — 0 이면 음소거
  sidebarRefresh: true, // 사이드바 30초마다 자동 갱신
  expandFollowing: false, // 사이드바 팔로잉 목록 진입 시 자동 펼침
  channelChatTab: true, // 채널 홈 탭에 "채팅" 탭 추가 (오프라인이어도 채팅 진입)
  autoReload: false, // 오프라인 채널 방송 시작 시 자동 새로고침
};
