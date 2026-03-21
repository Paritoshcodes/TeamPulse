import React from 'react';

/**
 * AppShell
 * Global layout shell:
 * - Sidebar (fixed 220px)
 * - Main area (header + content)
 */
const AppShell = ({ rail, sidebar, header, children }) => {
    return (
        <div className="app-atmosphere fixed inset-0 flex overflow-hidden bg-[var(--color-base-900)]">
            <div className="flex h-full w-full min-w-0">
                {rail}
                {sidebar}

                <div className="flex-1 flex flex-col min-w-0">
                    {header && (
                        <header className="w-full flex-shrink-0">
                            {header}
                        </header>
                    )}

                    <main className="app-content flex-1 overflow-hidden relative">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AppShell;
