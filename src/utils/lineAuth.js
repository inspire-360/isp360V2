export const LINE_LOGIN_REDIRECT_KEY = "lineLoginRedirectPath";

const AUTH_PATHS = new Set(["/", "/login", "/register"]);

const resolveSafeRedirectPath = (path) => {
  if (typeof window === "undefined") return "/dashboard";

  try {
    const parsed = new URL(path || "/dashboard", window.location.origin);
    const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return AUTH_PATHS.has(parsed.pathname) ? "/dashboard" : nextPath;
  } catch {
    return "/dashboard";
  }
};

export const storeLineLoginRedirectPath = (path) => {
  if (typeof window === "undefined") return "/dashboard";

  const nextPath = resolveSafeRedirectPath(path);
  sessionStorage.setItem(LINE_LOGIN_REDIRECT_KEY, nextPath);
  return nextPath;
};

export const consumeLineLoginRedirectPath = () => {
  if (typeof window === "undefined") return "/dashboard";

  const nextPath = sessionStorage.getItem(LINE_LOGIN_REDIRECT_KEY);
  sessionStorage.removeItem(LINE_LOGIN_REDIRECT_KEY);
  return resolveSafeRedirectPath(nextPath || "/dashboard");
};

export const buildLineLoginRedirectUri = () => {
  if (typeof window === "undefined") return undefined;

  storeLineLoginRedirectPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  return new URL("/login", window.location.origin).toString();
};
