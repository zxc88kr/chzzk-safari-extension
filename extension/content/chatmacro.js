"use strict";

// 자주 쓰는 문구: 채팅 입력 툴바(후원하기 오른쪽)의 💬 버튼으로 저장 문구를 입력한다.
// 직접 입력(execCommand)을 시도하고, React 상태 동기화 실패가 감지되면
// 클립보드 복사로 폴백한다 (chzzk-plus 는 아예 복사 방식만 사용).
(() => {
  const STORAGE_KEY = "czseSavedMessages";
  let messages = null;

  const load = async () => {
    const stored = await czse.api.storage.local.get({ [STORAGE_KEY]: [] });
    messages = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  };
  const persist = () => czse.api.storage.local.set({ [STORAGE_KEY]: messages });

  const findInput = () =>
    document.querySelector(
      '#aside-chatting pre[contenteditable="true"], #aside-chatting [contenteditable="true"], #aside-chatting textarea'
    );

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const verify = (text) => {
    const input = findInput();
    return !!input && (input.textContent ?? input.value ?? "").includes(text);
  };

  // 시도 체인: execCommand → 가짜 paste 이벤트. 포커스로 입력창이
  // 리렌더될 수 있어 매 단계마다 요소를 다시 찾고 잠깐 기다린다.
  const tryInsert = async (text) => {
    let input = findInput();
    if (!input) return false;
    input.focus();
    await wait(60);

    input = findInput();
    if (!input) return false;
    const selection = window.getSelection();
    selection.selectAllChildren(input);
    selection.collapseToEnd();
    document.execCommand("insertText", false, text);
    await wait(60);
    if (verify(text)) return true;

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      findInput()?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })
      );
      await wait(60);
      if (verify(text)) return true;
    } catch {
      /* ClipboardEvent 생성 미지원 등 */
    }
    return false;
  };

  let button = null;
  let panel = null;
  let toast = null;

  const showToast = (text) => {
    toast?.remove();
    toast = document.createElement("div");
    toast.className = "czse-macro-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    const rect = button?.getBoundingClientRect();
    if (rect) {
      toast.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
      toast.style.top = `${Math.round(rect.top - 36)}px`;
    }
    setTimeout(() => {
      toast?.remove();
      toast = null;
    }, 2500);
  };

  const useMessage = async (message) => {
    if (await tryInsert(message)) return;
    // 직접 입력 실패 → 클립보드 폴백
    navigator.clipboard?.writeText(message).catch(() => {});
    findInput()?.focus();
    showToast("복사됨 · ⌘V 로 붙여넣으세요");
  };

  const closePanel = () => {
    panel?.remove();
    panel = null;
  };

  const openPanel = () => {
    closePanel();
    panel = document.createElement("div");
    panel.className = "czse-macro-panel";

    const list = document.createElement("div");
    list.className = "czse-macro-list";
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "czse-macro-empty";
      empty.textContent = "저장된 문구가 없습니다";
      list.appendChild(empty);
    }
    messages.forEach((message, index) => {
      const row = document.createElement("div");
      row.className = "czse-macro-row";
      const text = document.createElement("button");
      text.type = "button";
      text.className = "czse-macro-text";
      text.textContent = message;
      // mousedown 기본동작을 막아 채팅 입력창의 포커스를 뺏지 않는다
      text.addEventListener("mousedown", (e) => e.preventDefault());
      text.addEventListener("click", () => {
        closePanel();
        useMessage(message);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "czse-macro-del";
      remove.setAttribute("aria-label", "삭제");
      remove.textContent = "×";
      remove.addEventListener("mousedown", (e) => e.preventDefault());
      remove.addEventListener("click", () => {
        messages.splice(index, 1);
        persist();
        openPanel();
      });
      row.append(text, remove);
      list.appendChild(row);
    });

    const addRow = document.createElement("div");
    addRow.className = "czse-macro-add";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "새 문구 추가";
    const add = () => {
      const value = input.value.trim();
      if (!value) return;
      messages.push(value);
      persist();
      openPanel();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") add();
    });
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "추가";
    addButton.addEventListener("click", add);
    addRow.append(input, addButton);

    panel.append(list, addRow);
    document.body.appendChild(panel);

    // 버튼 위에 고정 위치로 띄운다
    const rect = button.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    panel.style.left = `${Math.round(
      Math.min(rect.right - panelRect.width, window.innerWidth - panelRect.width - 8)
    )}px`;
    panel.style.top = `${Math.round(rect.top - panelRect.height - 8)}px`;
  };

  // 패널 밖 클릭 시 닫기
  document.addEventListener("click", (e) => {
    if (!panel) return;
    if (panel.contains(e.target) || button?.contains(e.target)) return;
    closePanel();
  });

  czse.util.poll(async () => {
    if (messages === null) await load();
    const aside = czse.util.chatAside();
    const existing = [...document.querySelectorAll(".czse-macro-button")];
    if (!czse.settings.chatMacros || !aside) {
      existing.forEach((el) => el.remove());
      button = null;
      closePanel();
      return;
    }

    // 후원 액션 줄(치즈 후원하기 | 후원·영상·미션 아이콘)의 맨 끝에 배치.
    // 버튼 2개 이상을 포함하는 가장 작은 _donation_ 컨테이너 = 액션 줄.
    const donationArea =
      [...aside.querySelectorAll('[class*="_donation_"]')]
        .filter((el) => !el.closest('[role="log"]') && el.querySelectorAll("button").length >= 2)
        .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0] ??
      null;
    if (!donationArea) {
      // 리렌더 중이거나 후원 줄이 없는 화면 — 버튼을 만들지 않는다 (중복 방지)
      existing.forEach((el) => el.remove());
      button = null;
      return;
    }

    // 올바른 위치의 버튼 하나만 남기고 전부 정리 (SPA 리렌더로 생긴 중복 제거)
    const valid = existing.find((el) => donationArea.contains(el));
    existing.forEach((el) => {
      if (el !== valid) el.remove();
    });
    if (valid) {
      button = valid;
      return;
    }
    closePanel();

    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "자주 쓰는 문구"); // CSS 툴팁 겸용 (title 은 이중 툴팁이라 제외)
    // 치지직 아이콘들과 어울리는 모노크롬 말풍선 라인 아이콘
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>';
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => (panel ? closePanel() : openPanel()));
    // 같은 줄 마지막 아이콘 버튼(미션 후원)의 클래스를 이어받아 크기·정렬을 맞춘다
    const template = [...donationArea.querySelectorAll("button")].pop();
    button.className = `${template?.className ?? ""} czse-macro-button czse-macro-inline`.trim();
    donationArea.appendChild(button);
  }, 1000);
})();
