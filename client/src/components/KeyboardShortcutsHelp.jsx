import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { scaleIn } from '../utils/motionPresets.js';

const sections = [
  {
    title: 'Navigation',
    rows: [
      { key: '⌘K / Ctrl+K', label: 'Open search' },
      { key: 'Esc', label: 'Close modal' },
    ],
  },
  {
    title: 'Messaging',
    rows: [
      { key: '↵', label: 'Send message' },
      { key: '⇧↵', label: 'New line' },
      { key: '↑', label: 'Edit last message (future)' },
    ],
  },
  {
    title: 'Interface',
    rows: [
      { key: '⌘/ / Ctrl+/', label: 'Show this help' },
    ],
  },
];

export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-base-950)]/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            {...scaleIn}
            className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-800)] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-base-600)]/40 px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-base-50)]">Keyboard Shortcuts</h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
                onClick={onClose}
                aria-label="Close keyboard shortcuts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--color-base-500)]">
                      {section.title}
                    </p>
                    <div>
                      {section.rows.map((row, index) => (
                        <div
                          key={`${section.title}-${row.key}`}
                          className={`flex items-center justify-between py-2 ${
                            index === section.rows.length - 1 ? '' : 'border-b border-[var(--color-base-600)]/20'
                          }`}
                        >
                          <span className="text-sm text-[var(--color-base-300)]">{row.label}</span>
                          <kbd className="inline-flex items-center rounded border border-[var(--color-base-600)] bg-[var(--color-base-700)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--color-base-400)]">
                            {row.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
