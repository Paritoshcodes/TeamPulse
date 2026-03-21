/**
 * Socket context – one socket for the app. Used by ChatWindow.
 */
import { createContext, useContext } from 'react';
import { useSocket } from '../hooks/useSocket.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socket = useSocket();
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
