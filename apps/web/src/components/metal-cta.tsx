'use client';

import { useEffect, useState } from 'react';
import { MetalFx } from 'metal-fx';

/**
 * MetalFx renders different markup on the server (unsupported fallback) and the client (WebGL wrapper), which
 * breaks hydration. Server and first client render emit the plain child; the metal ring is added after mount.
 */
export function MetalCta({ children }: { children: React.ReactElement }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <MetalFx variant="button">{children}</MetalFx> : children;
}
