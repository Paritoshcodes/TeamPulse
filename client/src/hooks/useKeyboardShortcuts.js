import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl+K — open search
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.openSearch?.();
      }

      // Cmd/Ctrl+/ — show shortcuts help
      if (mod && e.key === '/') {
        e.preventDefault();
        handlers.showHelp?.();
      }

      // Escape — close topmost modal
      if (e.key === 'Escape') {
        handlers.escape?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
