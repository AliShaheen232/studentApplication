const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)ap_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const nativeFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const request = input instanceof Request ? input : null;
  const method = (init.method || request?.method || "GET").toUpperCase();
  if (!SAFE.has(method)) {
    const url = new URL(request ? request.url : String(input), window.location.href);
    const token = csrfToken();
    if (url.origin === window.location.origin && token) {
      const headers = new Headers(init.headers || request?.headers);
      headers.set("X-CSRF-Token", token);
      init = { ...init, headers };
    }
  }
  return nativeFetch(input, init);
};
