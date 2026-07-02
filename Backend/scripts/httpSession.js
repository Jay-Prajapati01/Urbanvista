const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE || "uv_csrf_token";

function parseSetCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

class HttpSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  applySetCookie(response) {
    const setCookies = parseSetCookie(response);
    for (const entry of setCookies) {
      const pair = String(entry || "").split(";")[0] || "";
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  getCsrfToken() {
    return this.cookies.get(CSRF_COOKIE_NAME) || "";
  }

  async request(method, path, options = {}) {
    const headers = {
      ...(options.json ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }

    if (options.withCsrf) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.json ? JSON.stringify(options.json) : undefined,
    });

    this.applySetCookie(response);

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return {
      status: response.status,
      body,
      headers: response.headers,
    };
  }
}

module.exports = {
  HttpSession,
  CSRF_COOKIE_NAME,
};
