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

  const insertText = (text) => {
    const input = findInput();
    if (!input) return false;
    input.focus();
    const selection = window.getSelection();
    selection.selectAllChildren(input);
    selection.collapseToEnd();
    document.execCommand("insertText", false, text);
    return (input.textContent ?? input.value ?? "").includes(text);
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

  const useMessage = (message) => {
    if (insertText(message)) return;
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

  setInterval(async () => {
    await czse.ready;
    if (messages === null) await load();
    const aside = document.getElementById("aside-chatting");
    if (!czse.settings.chatMacros || !aside) {
      button?.remove();
      button = null;
      closePanel();
      return;
    }
    if (button?.isConnected) return;
    closePanel();

    // 후원하기 버튼 오른쪽에 배치 (없으면 채팅 영역 우하단 플로팅으로 폴백)
    const anchor = [...aside.querySelectorAll("button")].find((b) =>
      (b.getAttribute("aria-label") ?? "").includes("후원")
    );
    button = document.createElement("button");
    button.type = "button";
    button.title = "자주 쓰는 문구";
    button.textContent = "💬";
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => (panel ? closePanel() : openPanel()));
    if (anchor) {
      button.className = "czse-macro-button czse-macro-inline";
      anchor.insertAdjacentElement("afterend", button);
    } else {
      button.className = "czse-macro-button czse-macro-floating";
      if (getComputedStyle(aside).position === "static") aside.style.position = "relative";
      aside.appendChild(button);
    }
  }, 1000);
})();
