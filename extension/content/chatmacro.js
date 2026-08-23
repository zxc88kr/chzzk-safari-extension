"use strict";

// 자주 쓰는 문구: 채팅 영역의 💬 버튼 → 저장된 문구를 클릭 한 번에 입력창에 넣는다.
// (전송은 하지 않는다 — Enter 는 사용자가 직접)
(() => {
  const STORAGE_KEY = "czseSavedMessages";
  let messages = null; // 로드 전 null

  const load = async () => {
    const stored = await czse.api.storage.local.get({ [STORAGE_KEY]: [] });
    messages = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  };
  const persist = () => czse.api.storage.local.set({ [STORAGE_KEY]: messages });

  const findInput = () =>
    document.querySelector(
      '#aside-chatting pre[contenteditable="true"], #aside-chatting [contenteditable="true"], #aside-chatting textarea'
    );

  // React 제어 contenteditable 에는 execCommand("insertText") 가 input 이벤트를
  // 발생시켜 상태 동기화까지 되는 가장 안전한 입력 방법이다.
  const insertText = (text) => {
    const input = findInput();
    if (!input) return;
    input.focus();
    const selection = window.getSelection();
    selection.selectAllChildren(input);
    selection.collapseToEnd();
    document.execCommand("insertText", false, text);
  };

  let button = null;
  let panel = null;

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
      text.addEventListener("click", () => {
        insertText(message);
        closePanel();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "czse-macro-del";
      remove.setAttribute("aria-label", "삭제");
      remove.textContent = "×";
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
    button.parentElement.appendChild(panel);
    input.focus();
  };

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
    button = document.createElement("button");
    button.type = "button";
    button.className = "czse-macro-button";
    button.title = "자주 쓰는 문구";
    button.textContent = "💬";
    button.addEventListener("click", () => (panel ? closePanel() : openPanel()));
    if (getComputedStyle(aside).position === "static") aside.style.position = "relative";
    aside.appendChild(button);
  }, 1000);
})();
