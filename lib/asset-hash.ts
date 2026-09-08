/** Keep model integrity checks available in WebViews without Web Crypto. */
export async function assetSha256(
  bytes: ArrayBuffer,
  subtle: Pick<SubtleCrypto, 'digest'> | null | undefined = globalThis.crypto?.subtle,
): Promise<string> {
  const digest = subtle
    ? new Uint8Array(await subtle.digest('SHA-256', bytes))
    : (await import('@noble/hashes/sha2.js')).sha256(new Uint8Array(bytes));
  return Array.from(digest, (n) => n.toString(16).padStart(2, '0')).join('');
}
