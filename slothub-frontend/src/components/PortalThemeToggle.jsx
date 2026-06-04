import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { usePortalTheme } from '../context/PortalThemeContext';

const PortalThemeToggle = ({ className = '' }) => {
  const { theme, setTheme } = usePortalTheme();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border p-0.5 ${className}`}
      style={{
        backgroundColor: 'var(--portal-surface)',
        borderColor: 'var(--portal-border)',
      }}
      role="group"
      aria-label="Giao diện sáng / tối"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Giao diện sáng"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
          theme === 'light' ? 'bg-[#F27124] text-white shadow-sm' : 'text-[var(--portal-muted)] hover:text-[var(--portal-text)]'
        }`}
      >
        <Sun size={14} />
        <span className="hidden sm:inline">Sáng</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Giao diện tối"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
          theme === 'dark' ? 'bg-[#F27124] text-white shadow-sm' : 'text-[var(--portal-muted)] hover:text-[var(--portal-text)]'
        }`}
      >
        <Moon size={14} />
        <span className="hidden sm:inline">Tối</span>
      </button>
    </div>
  );
};

export default PortalThemeToggle;
