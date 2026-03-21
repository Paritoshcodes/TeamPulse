export default function UnreadDivider() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="h-px flex-1 bg-[var(--color-brand-500)]/50" />
      <span className="whitespace-nowrap rounded-full bg-[var(--color-brand-500)]/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--color-brand-400)]">
        New Messages
      </span>
      <div className="h-px flex-1 bg-[var(--color-brand-500)]/50" />
    </div>
  );
}
