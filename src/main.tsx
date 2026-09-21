import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safeguard against environments/extensions attempting to set window.fetch when it has only a getter
try {
  const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
  if (target && target.fetch) {
    const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
    if (!desc || (!desc.writable && !desc.set)) {
      const nativeFetch = target.fetch;
      let currentFetch = (...args: Parameters<typeof fetch>) => nativeFetch.apply(target, args);
      Object.defineProperty(target, 'fetch', {
        get() {
          return currentFetch;
        },
        set(fn) {
          currentFetch = fn;
        },
        configurable: true,
        enumerable: true,
      });
    }
  }
} catch {
  // Ignore fallback
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
