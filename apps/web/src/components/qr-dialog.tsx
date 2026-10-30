'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, X } from 'lucide-react';
import { serverUrl } from '@/lib/config';
import { Button } from './ui';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export function useRoomUrl(code: string): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const { protocol, hostname, port, origin } = window.location;
    setUrl(`${origin}/r/${code}`);
    if (!LOOPBACK.has(hostname)) return;
    // "localhost" in a QR code means the phone itself: swap in this laptop's Wi-Fi address (local runs)
    let live = true;
    fetch(`${serverUrl()}/lan`)
      .then((r) => r.json() as Promise<{ ips?: string[] }>)
      .then((j) => { const ip = j.ips?.[0]; if (live && ip) setUrl(`${protocol}//${ip}${port ? `:${port}` : ''}/r/${code}`); })
      .catch(() => {});
    return () => { live = false; };
  }, [code]);
  return url;
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      className="w-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy invite link'}
    </Button>
  );
}

export function QrCard({ code, size = 152 }: { code: string; size?: number }) {
  const url = useRoomUrl(code);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border-[2.5px] border-line bg-white p-2.5">{url ? <QRCodeSVG value={url} size={size} level="M" bgColor="#ffffff" fgColor="#0c0c0f" /> : <div style={{ width: size, height: size }} />}</div>
      <CopyLink url={url} />
    </div>
  );
}

export function QrDialog({ code, open, onClose }: { code: string; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6" role="dialog" aria-modal aria-label="Invite people">
          <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} className="brut-lg relative w-full max-w-xs rotate-1 rounded-3xl bg-surface p-6 text-center">
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-faint hover:bg-surface hover:text-fg"><X size={18} /></button>
            <p className="text-sm font-extrabold uppercase tracking-wide">Scan to join</p>
            <h2 className="mb-5 mt-1 inline-block -rotate-2 rounded-xl border-[2.5px] border-line bg-acid px-3 font-display text-5xl uppercase tracking-[0.12em] shadow-[4px_4px_0_var(--color-line)]">{code}</h2>
            <QrCard code={code} size={196} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
