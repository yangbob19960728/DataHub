import '@testing-library/jest-dom';
// 防止錯誤的 style.textContent 被 jsdom 解析
beforeAll(() => {
  // const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');

  Object.defineProperty(HTMLStyleElement.prototype, 'textContent', {
    set() {
      // 忽略樣式內容寫入，防止 jsdom 報錯
    },
    get() {
      return '';
    },
    configurable: true,
  });

  // adoptedStyleSheets polyfill（保底）
  if (!('adoptedStyleSheets' in document)) {
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
    });
  }
});