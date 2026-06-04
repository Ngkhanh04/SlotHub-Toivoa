import fs from 'fs';
import path from 'path';

const dirs = [
  'src/pages/admin/subpages',
  'src/pages/vendor/subpages',
  'src/components/admin',
  'src/components/vendor',
  'src/components/messaging',
];

const replacements = [
  ['border-gray-800/60', 'border-[var(--portal-border-soft)]'],
  ['border-gray-800', 'border-[var(--portal-border)]'],
  ['border-gray-700', 'border-[var(--portal-border)]'],
  ['bg-[#1E293B]/50', 'portal-card opacity-70 border'],
  ['bg-[#1E293B]', 'portal-card border'],
  ['bg-[#111827]', 'bg-[var(--portal-sidebar)]'],
  ['bg-gray-900/50', 'bg-[var(--portal-table-head)]'],
  ['bg-gray-900/30', 'bg-[var(--portal-table-head)]'],
  ['bg-gray-800/50', 'bg-[var(--portal-surface)]'],
  ['bg-gray-800/40', 'bg-[var(--portal-surface-hover)]'],
  ['bg-gray-800', 'bg-[var(--portal-surface)]'],
  ['divide-gray-800', 'divide-[var(--portal-border)]'],
  ['hover:bg-gray-800/30', 'hover:bg-[var(--portal-surface-hover)]'],
  ['hover:bg-gray-800/40', 'hover:bg-[var(--portal-surface-hover)]'],
  ['hover:bg-gray-800/80', 'hover:bg-[var(--portal-surface-hover)]'],
  ['hover:border-gray-700', 'hover:border-[var(--portal-border)]'],
  ['text-gray-400', 'portal-muted'],
  ['text-gray-500', 'portal-muted'],
  ['text-gray-300', 'portal-text-secondary'],
  ['bg-gray-900', 'bg-[var(--portal-input-bg)]'],
  ['bg-[#0B1121]', 'bg-[var(--portal-input-bg)]'],
  ['hover:text-white', 'hover:text-[var(--portal-text)]'],
  ['border-[#1E293B]', 'border-[var(--portal-card)]'],
  ['hover:bg-gray-700', 'hover:bg-[var(--portal-surface-hover)]'],
  ['font-black text-white', 'font-black'],
  ['font-bold text-white', 'font-bold'],
  ['tracking-tight text-white', 'tracking-tight'],
  ['text-white mb-', 'mb-'],
  ['text-white mt-', 'mt-'],
  ['text-white line-clamp', 'line-clamp'],
  ['text-white truncate', 'truncate'],
  ['text-white text-sm', 'text-sm'],
  ['text-white text-base', 'text-base'],
  ['text-white text-lg', 'text-lg'],
  ['text-white text-xl', 'text-xl'],
  ['text-white text-2xl', 'text-2xl'],
  ['text-white text-4xl', 'text-4xl'],
  ['text-white font-mono', 'font-mono text-[var(--portal-text)]'],
  ['text-white uppercase', 'uppercase text-[var(--portal-text)]'],
  ['text-white flex', 'flex text-[var(--portal-text)]'],
  ['outline-none text-white', 'outline-none text-[var(--portal-text)]'],
  ['py-3 text-white', 'py-3 text-[var(--portal-text)]'],
  ['rounded-xl px-4 py-3 text-white', 'rounded-xl px-4 py-3 portal-input border'],
  ['rounded-xl px-4 py-3 outline-none text-white', 'rounded-xl px-4 py-3 outline-none portal-input border text-[var(--portal-text)]'],
  ['portal-card border border border', 'portal-card border'],
  ['text-sm text-white', 'text-sm text-[var(--portal-text)]'],
  ['text-white font-bold', 'font-bold'],
  ['text-white font-black', 'font-black'],
  ['text-white font-medium', 'font-medium'],
  [": 'text-white'}", ": 'text-[var(--portal-text)]'}"],
  ['hover:border-gray-600', 'hover:border-[var(--portal-border)]'],
  ['border-gray-600', 'border-[var(--portal-border)]'],
  ['hover:border-gray-600', 'hover:border-[var(--portal-border)]'],
  [' text-white px-5', ' text-[var(--portal-text)] px-5'],
  ['text-white px-5', 'text-[var(--portal-text)] px-5'],
  ['font-black text-lg text-white', 'font-black text-lg'],
  ['strong className="text-white"', 'strong className="text-[var(--portal-text)]"'],
];

const root = path.resolve('.');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(ent.name)) {
      let c = fs.readFileSync(p, 'utf8');
      const orig = c;
      for (const [a, b] of replacements) c = c.split(a).join(b);
      if (c !== orig) {
        fs.writeFileSync(p, c);
        console.log('updated', path.relative(root, p));
      }
    }
  }
}

dirs.forEach((d) => walk(path.join(root, d)));
console.log('finished');
