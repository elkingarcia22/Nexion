'use client';

import { createPortal } from 'react-dom';

export function LinkedItemSubDrawer({
  type,
  data,
  onClose,
}: {
  type: 'objective' | 'jira';
  data: any;
  onClose: () => void;
}) {
  const label = type === 'objective' ? 'Objetivo Vinculado' : 'Jira Vinculado';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0A0C14] shadow-2xl border-l border-white/5 animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161927]/50">
          <div className="flex items-center gap-3">
            {type === 'objective' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                <path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/>
              </svg>
            )}
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{label}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-xl font-black text-white">{data?.title || label}</h2>
          {data?.description && <p className="text-sm text-white/60 leading-relaxed">{data.description}</p>}
          {data?.narrative && <p className="text-sm text-white/60 leading-relaxed">{data.narrative}</p>}
          {Object.entries(data || {})
            .filter(([k]) => !['id', 'title', 'description', 'narrative', 'workspace_id', 'created_at', 'updated_at', 'last_synced_at', 'external_row_index'].includes(k))
            .map(([key, val]) => (
              <div key={key} className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{key}</span>
                <p className="text-sm text-white/80">{String(val)}</p>
              </div>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
