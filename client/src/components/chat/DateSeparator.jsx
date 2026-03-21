import { format, isToday, isYesterday } from 'date-fns';

export default function DateSeparator({ date }) {
  const parsedDate = new Date(date);

  let label = format(parsedDate, 'EEEE, MMMM d');
  if (isToday(parsedDate)) {
    label = 'Today';
  } else if (isYesterday(parsedDate)) {
    label = 'Yesterday';
  }

  return (
    <div className="flex select-none items-center gap-3 px-4 py-3">
      <div className="h-px flex-1 bg-[var(--color-base-600)]/40" />
      <span className="whitespace-nowrap px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--color-base-500)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--color-base-600)]/40" />
    </div>
  );
}
