'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, X } from 'lucide-react';
import { Button } from './ui';

export function useRoomUrl(code: string): string {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(`${window.location.origin}/r/${code}`), [code]);
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
      <div className="rounded-xl bg-white p-2.5">{url ? <QRCodeSVG value={url} size={size} level="M" bgColor="#ffffff" fgColor="#0c0c0f" /> : <div style={{ width: size, height: size }} />}</div>
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
          <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xs rounded-2xl border border-line bg-panel p-6 text-center">
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-faint hover:bg-surface hover:text-fg"><X size={18} /></button>
            <p className="text-sm text-muted">Scan to join</p>
            <h2 className="mb-5 font-mono text-3xl font-bold tracking-[0.25em]">{code}</h2>
            <QrCard code={code} size={196} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
