import { motion } from 'framer-motion';

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.name || u.email || 'Someone');
  const text =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--color-base-400)]">
      <span>{text}</span>
      <div className="flex gap-1">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-base-400)]"
          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
        />
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-base-400)]"
          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }}
        />
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-base-400)]"
          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.24 }}
        />
      </div>
    </div>
  );
}
