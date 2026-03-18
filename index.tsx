import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill for environments where crypto.randomUUID is not available (e.g., some browsers / older WebViews)
// The library `react-text-to-speech` uses crypto.randomUUID internally.
// See: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
if (typeof window !== 'undefined') {
  const globalCrypto = (window.crypto ?? (window as any).msCrypto) as Crypto | undefined;
  if (globalCrypto && !(globalCrypto as any).randomUUID) {
    (globalCrypto as any).randomUUID = () => {
      const bytes = new Uint8Array(16);
      globalCrypto.getRandomValues(bytes);
      // Per RFC 4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
    };
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
