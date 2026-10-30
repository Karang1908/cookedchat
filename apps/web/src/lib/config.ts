/**
 * The game server. Deployed builds bake NEXT_PUBLIC_SERVER_URL in. Unset (local runs): the host this page was loaded from,
 * port 4000, so a phone that opened http://192.168.x.x:3000 talks to the laptop, not to itself. Browser only.
 */
export function serverUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
}
