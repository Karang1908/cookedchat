import { networkInterfaces } from 'node:os';

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** This machine's private IPv4 addresses, Wi-Fi/Ethernet first: what phones on the same network can reach (local runs). */
export function lanAddresses(ifaces: ReturnType<typeof networkInterfaces> = networkInterfaces()): string[] {
  const found: { name: string; address: string }[] = [];
  for (const [name, list] of Object.entries(ifaces)) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal && PRIVATE.test(a.address)) found.push({ name, address: a.address });
  }
  const rank = (name: string) => (/^(en|eth|wl)/.test(name) ? 0 : 1);
  return found.sort((a, b) => rank(a.name) - rank(b.name)).map((x) => x.address);
}
