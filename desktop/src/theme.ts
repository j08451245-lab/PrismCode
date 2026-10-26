export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#fafafa');
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try { localStorage.setItem('prismcode.theme', theme); } catch { /* The toggle still works when storage is unavailable. */ }
  window.dispatchEvent(new Event('prismcode-theme-change'));
}

// Apply the saved palette before constructing the workspace.
let saved: Theme = 'dark';
try { if (localStorage.getItem('prismcode.theme') === 'light') saved = 'light'; } catch { /* Use the default palette. */ }
applyTheme(saved);
