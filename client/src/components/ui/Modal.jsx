import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    className = '',
}) => {
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel
                                className={`
                                    w-full ${sizes[size]} transform overflow-hidden rounded-2xl
                                    border border-border bg-card text-card-foreground shadow-2xl
                                    p-5 text-left align-middle transition-all
                                    ${className}
                                `}
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-semibold leading-6 text-foreground"
                                    >
                                        {title}
                                    </Dialog.Title>

                                    <button
                                        onClick={onClose}
                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                    {children}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default Modal;
