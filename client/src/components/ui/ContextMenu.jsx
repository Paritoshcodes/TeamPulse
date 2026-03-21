import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const ContextMenu = ({ isOpen, onClose, position, items }) => {
    const menuRef = useRef(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        // Calculate menu dimensions
        const menuRect = menuRef.current.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate adjusted position
        let newX = position.x;
        let newY = position.y;

        // Check right boundary
        if (position.x + menuWidth > viewportWidth) {
            newX = viewportWidth - menuWidth - 10;
        }

        // Check bottom boundary
        if (position.y + menuHeight > viewportHeight) {
            newY = viewportHeight - menuHeight - 10;
        }

        // Check left boundary
        if (newX < 10) newX = 10;

        // Check top boundary
        if (newY < 10) newY = 10;

        setAdjustedPosition({ x: newX, y: newY });
    }, [isOpen, position]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const content = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed z-[100] min-w-[200px] overflow-hidden rounded-lg border border-border bg-popover py-1.5 text-popover-foreground shadow-lg"
                    style={{
                        top: adjustedPosition.y,
                        left: adjustedPosition.x,
                    }}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            disabled={item.disabled}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors
                                ${item.danger
                                    ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                    : 'text-foreground hover:bg-accent/15 hover:text-foreground'
                                }
                                ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {item.icon && <item.icon size={15} strokeWidth={2} />}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
};

export default ContextMenu;
