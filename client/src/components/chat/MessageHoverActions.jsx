import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  CornerDownLeft,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';

export default function MessageHoverActions({
  message,
  anchor,
  isOwnMessage,
  onReact,
  onReply,
  onThread,
  onEdit,
  onDelete,
  onPin,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ top: 8, left: 8 });
  const actionsRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const element = actionsRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const padding = 8;
    const desiredTop = Math.max(padding, (anchor?.y ?? 0) - 40);
    const desiredLeft = Math.max(padding, (anchor?.x ?? 0) + 10);

    const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
    const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);

    const clampedLeft = Math.min(desiredLeft, maxLeft);
    const clampedTop = Math.min(desiredTop, maxTop);

    setPosition({ top: clampedTop, left: clampedLeft });
  }, [anchor?.x, anchor?.y, menuOpen]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message?.content || '');
    } catch {
    }
    setMenuOpen(false);
  };

  return (
    <motion.div
      ref={actionsRef}
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.1 }}
      className="fixed z-30 flex items-center gap-0.5 rounded-xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-700)] px-1 py-0.5 shadow-lg pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
        <button
          type="button"
          onClick={() => onReact?.(message?._id, '👍')}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)] hover:text-[var(--color-base-100)]"
          title="React"
        >
          😀
        </button>

        <button
          type="button"
          onClick={() => onReply?.(message)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)] hover:text-[var(--color-base-100)]"
          title="Reply"
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onThread?.(message)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)] hover:text-[var(--color-base-100)]"
          title="Thread"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>

        {isOwnMessage && (
          <button
            type="button"
            onClick={() => onEdit?.(message)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)] hover:text-[var(--color-base-100)]"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="mx-0.5 h-4 w-px bg-[var(--color-base-600)]" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)] hover:text-[var(--color-base-100)]"
            title="More"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[var(--color-base-600)]/60 bg-[var(--color-base-700)] shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onPin?.(message?._id);
                  setMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-50)]"
              >
                <Pin className="h-3.5 w-3.5" />
                Pin message
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-50)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy text
              </button>

              {isOwnMessage && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(message?._id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
    </motion.div>
  );
}
