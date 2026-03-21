import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
    return (
        <Toaster
            position="bottom-right"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
                bottom: 24,
                right: 24,
            }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: 'var(--color-base-700)',
                    color: 'var(--color-base-100)',
                    border: '1px solid rgb(var(--color-base-500-rgb) / 0.4)',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    maxWidth: '400px',
                },
                success: {
                    iconTheme: {
                        primary: 'var(--color-success)',
                        secondary: 'var(--color-base-700)',
                    },
                },
                error: {
                    iconTheme: {
                        primary: 'var(--color-danger)',
                        secondary: 'var(--color-base-700)',
                    },
                },
            }}
        />
    );
};

export default ToastProvider;
