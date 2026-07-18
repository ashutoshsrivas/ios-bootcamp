import { useEffect, useState } from 'react';
import { BASE } from '../lib/api';

export const bgUrl = (template) => {
  const u = template?.background_url || '';
  if (!u) return '';
  return /^https?:/i.test(u) ? u : `${BASE}${u}`;
};

// Values available to fields for a sample render (editor preview).
export const SAMPLE = {
  name: 'Saksham Joshi',
  date: '14 July – 17 July 2026',
  serial: 'IOSDC-2026-0001',
  issued_on: new Date().toLocaleDateString(),
};

// The concrete value set for an issued certificate (merges auto keys).
export const certValues = (cert) => ({
  ...(cert.values || {}),
  serial: cert.serial || '',
  issued_on: cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '',
});

const imgCache = new Map();
function loadImage(src) {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error('Could not load the certificate background'));
    img.src = src;
  });
}

// Render template + values to a PNG data URL (same path used for on-screen preview).
export async function renderCertificatePng(template, values, scale = 2) {
  const img = await loadImage(bgUrl(template));
  const w = img.naturalWidth || template.width || 1000;
  const h = img.naturalHeight || template.height || 700;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);
  for (const f of template.fields || []) {
    const val = values?.[f.key];
    if (val == null || val === '') continue;
    const size = ((Number(f.size) || 5) / 100) * h;
    ctx.font = `${f.bold ? '700' : '400'} ${size}px ${f.fontFamily || 'Helvetica, Arial, sans-serif'}`;
    ctx.fillStyle = f.color || '#111111';
    ctx.textAlign = f.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), ((Number(f.x) || 50) / 100) * w, ((Number(f.y) || 50) / 100) * h);
  }
  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

// WYSIWYG preview: renders through the same canvas the download uses.
export function CertificatePreview({ template, values, style }) {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    setErr('');
    if (!template?.background_url) { setUrl(''); return undefined; }
    renderCertificatePng(template, values, 2)
      .then((u) => { if (alive) setUrl(u); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [template, JSON.stringify(values)]);
  if (err) return <div style={{ color: 'var(--red)', fontSize: 13 }}>{err}</div>;
  if (!url) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Rendering…</div>;
  return <img src={url} alt="certificate" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', display: 'block', ...style }} />;
}
