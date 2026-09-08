export type MobileMode = 'atlas' | 'clock' | 'combinations' | 'sources' | 'about';
const modes: Record<string, MobileMode> = {
  '/': 'atlas', '/clock': 'clock', '/combinations': 'combinations',
  '/sources': 'sources', '/about': 'about',
};
export function resolveMobileLink(href: string, base: string):
  | { kind: 'local'; url: URL; mode: MobileMode }
  | { kind: 'external'; url: URL }
  | { kind: 'blocked' } {
  try {
    const url = new URL(href, base);
    const current = new URL(base);
    // Custom WebView schemes have an opaque origin: compare host and protocol explicitly.
    if (url.protocol === current.protocol && url.host === current.host) {
      const mode = modes[url.pathname];
      return mode ? { kind: 'local', url, mode } : { kind: 'blocked' };
    }
    if (url.protocol === 'https:' && !url.username && !url.password)
      return { kind: 'external', url };
  } catch { /* Untrusted or malformed navigation is not followed. */ }
  return { kind: 'blocked' };
}
export function mobileMode(pathname: string): MobileMode {
  return modes[pathname] ?? 'atlas';
}
