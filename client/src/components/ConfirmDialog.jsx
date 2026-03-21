import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button, Input } from './ui';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmDanger = false,
    loading = false,
    requireTypedConfirmation = false,
    confirmationText = '',
    requireCheckbox = false,
    checkboxLabel = 'I understand this action cannot be undone'
}) {
    const [typedText, setTypedText] = useState('');
    const [isChecked, setIsChecked] = useState(false);
    const [canConfirm, setCanConfirm] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTypedText('');
            setIsChecked(false);
            setCanConfirm(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const normalize = (value) => String(value || '')
            .normalize('NFKC')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        const entered = normalize(typedText);
        const expected = normalize(confirmationText);
        const stripHashPrefix = (value) => value.replace(/^#+/, '').trim();
        const expectedNoHash = stripHashPrefix(expected);
        const enteredNoHash = stripHashPrefix(entered);

        const textValid = requireTypedConfirmation
            ? (entered === expected || enteredNoHash === expectedNoHash)
            : true;
        const checkboxValid = requireCheckbox ? isChecked : true;
        setCanConfirm(textValid && checkboxValid);
    }, [typedText, confirmationText, isChecked, requireTypedConfirmation, requireCheckbox]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-2xl shadow-black/40 pointer-events-auto">
                            {confirmDanger && (
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
                                    <AlertTriangle size={24} className="text-red-500" />
                                </div>
                            )}
                            <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
                            <p className="mb-6 text-sm font-medium leading-relaxed text-muted-foreground">{message}</p>

                            {requireCheckbox && (
                                <div className="mb-6">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center ${isChecked
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-background group-hover:border-accent'
                                            }`}>
                                            {isChecked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => setIsChecked(e.target.checked)}
                                            className="hidden"
                                        />
                                        <span className="select-none pt-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">{checkboxLabel}</span>
                                    </label>
                                </div>
                            )}

                            {requireTypedConfirmation && (
                                <div className="mb-6">
                                    <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                        Type <span className="mx-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-foreground">{confirmationText}</span> to confirm
                                    </p>
                                    <Input
                                        value={typedText}
                                        onChange={(e) => setTypedText(e.target.value)}
                                        placeholder={confirmationText}
                                        autoFocus
                                        disabled={loading}
                                        className="bg-background"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 mt-8">
                                <Button variant="ghost" size="sm" onClick={onClose} className="flex-1" disabled={loading}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onConfirm}
                                    variant={confirmDanger ? 'danger' : 'primary'}
                                    className="flex-1"
                                    loading={loading}
                                    disabled={!canConfirm || loading}
                                >
                                    {confirmText}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
