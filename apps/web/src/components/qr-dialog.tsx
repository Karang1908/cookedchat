'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, X } from 'lucide-react';

export function QrCard({ code, size = 168 }: { code: string; size?: number }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${window.location.origin}/r/${code}`), [code]);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3">{url ? <QRCodeSVG value={url} size={size} level="M" bgColor="#ffffff" fgColor="#07071a" /> : <div style={{ width: size, height: size }} />}</div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 font-mono text-xs text-mute transition hover:text-white"
      >
        {copied ? <Check size={14} className="text-mint" /> : <Copy size={14} />}
        <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
      </button>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-modal aria-label="Invite QR code">
          <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass relative w-full max-w-xs rounded-3xl p-6 text-center">
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-mute hover:text-white"><X size={18} /></button>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-mute">scan to join</p>
            <h2 className="mb-4 font-display text-6xl uppercase tracking-wider">{code}</h2>
            <QrCard code={code} size={200} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
