// ID helpers used by browser-only chat state.
//
// crypto.randomUUID() is only exposed in secure contexts. Localhost counts as
// secure, but http://<LAN-IP>:8080 does not, so a phone/laptop on the same
// network could load the app and then fail as soon as a message was sent.
// Keep the secure API when it exists, and fall back to getRandomValues/Math for
// local-network HTTP sessions.

export function createClientId(prefix = '') {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return prefix ? `${prefix}-${uuid}` : uuid;
  } catch {}

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Shape the bytes like a v4 UUID when possible. This is not for security;
  // it only needs to be a collision-resistant client-side identifier.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0'));
  const id = `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  return prefix ? `${prefix}-${id}` : id;
}
