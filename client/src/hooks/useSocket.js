/**
 * useSocket – init socket with token, join/leave channel, sendMessage, listen for messages and typing
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import * as authService from '../services/authService.js';

const WS_URL = import.meta.env.VITE_PUBLIC_WS_URL || import.meta.env.VITE_PUBLIC_API_URL || '';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let socket = null;

    async function connect() {
      try {
        const { token } = await authService.getSocketToken();
        if (cancelled) return;
        socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;
        socket.on('connect', () => {
          if (!cancelled) setConnected(true);
        });
        socket.on('disconnect', (reason) => {
          if (!cancelled) setConnected(false);
        });
        socket.on('connect_error', (err) => {
          if (!cancelled) setError(err.message || 'Connection failed');
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to get token');
      }
    }

    connect();
    return () => {
      cancelled = true;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  const joinChannel = useCallback((channelId, onHistory) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));
    return new Promise((resolve, reject) => {
      socket.emit('join-channel', channelId, (res) => {
        if (res?.success && res.messages) onHistory?.(res.messages);
        if (res?.success) resolve(res); else reject(new Error(res?.message || 'Join failed'));
      });
    });
  }, []);

  const leaveChannel = useCallback((channelId) => {
    const socket = socketRef.current;
    if (socket) socket.emit('leave-channel', channelId);
  }, []);

  const sendMessage = useCallback((channelId, content, fileData = null) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    const payload = {
      channelId,
      content,
      ...(fileData?.fileUrl && {
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName || null,
        fileSize: fileData.fileSize || null,
        fileMimeType: fileData.fileMimeType || null,
      }),
    };

    return new Promise((resolve, reject) => {
      socket.emit('send-message', payload, (res) => {
        if (res?.success) resolve(res.message); else reject(new Error(res?.message || 'Send failed'));
      });
    });
  }, []);

  const emitTyping = useCallback((channelId) => {
    const socket = socketRef.current;
    if (socket) socket.emit('user:typing', channelId);
  }, []);

  const emitStopTyping = useCallback((channelId) => {
    const socket = socketRef.current;
    if (socket) socket.emit('user:stopTyping', channelId);
  }, []);

  const onNewMessage = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('message:new', cb);
    return () => socket.off('message:new', cb);
  }, []);

  const onHistory = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('message:history', cb);
    return () => socket.off('message:history', cb);
  }, []);

  const onTyping = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('user:typing', cb);
    return () => socket.off('user:typing', cb);
  }, []);

  const onStopTyping = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('user:stopTyping', cb);
    return () => socket.off('user:stopTyping', cb);
  }, []);

  const onReaction = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('message:reaction', cb);
    return () => socket.off('message:reaction', cb);
  }, []);

  const onMessageUpdated = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('message:updated', cb);
    return () => socket.off('message:updated', cb);
  }, []);

  const onMessageDeleted = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('message:deleted', cb);
    return () => socket.off('message:deleted', cb);
  }, []);

  const onThreadMessage = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('thread:message:new', cb);
    return () => socket.off('thread:message:new', cb);
  }, []);

  const onNotification = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('new_notification', cb);
    return () => socket.off('new_notification', cb);
  }, []);

  const joinCall = useCallback((roomId, metadata = {}) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:join', { roomId, ...metadata }, (res) => {
        if (res?.success) {
          resolve(res);
          return;
        }
        reject(new Error(res?.message || 'Failed to join call'));
      });
    });
  }, []);

  const leaveCall = useCallback((roomId) => {
    const socket = socketRef.current;
    if (!socket) return Promise.resolve();

    return new Promise((resolve) => {
      socket.emit('call:leave', { roomId }, () => resolve());
    });
  }, []);

  const sendCallSignal = useCallback((roomId, targetSocketId, signal) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:signal', { roomId, targetSocketId, signal }, (res) => {
        if (res?.success) {
          resolve(true);
          return;
        }
        reject(new Error(res?.message || 'Failed to send call signal'));
      });
    });
  }, []);

  const inviteCall = useCallback((roomId, title) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:invite', { roomId, title }, (res) => {
        if (res?.success) {
          resolve(res);
          return;
        }
        reject(new Error(res?.message || 'Failed to invite call participants'));
      });
    });
  }, []);

  const respondToCall = useCallback((roomId, callId, accept) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:respond', { roomId, callId, accept }, (res) => {
        if (res?.success) {
          resolve(res);
          return;
        }
        reject(new Error(res?.message || 'Failed to respond to call'));
      });
    });
  }, []);

  const endCall = useCallback((roomId) => {
    const socket = socketRef.current;
    if (!socket) return Promise.resolve();

    return new Promise((resolve, reject) => {
      socket.emit('call:end', { roomId }, (res) => {
        if (res?.success) {
          resolve(true);
          return;
        }
        reject(new Error(res?.message || 'Failed to end call'));
      });
    });
  }, []);

  const setRaisedHand = useCallback((roomId, raised) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:raise-hand', { roomId, raised }, (res) => {
        if (res?.success) {
          resolve(true);
          return;
        }
        reject(new Error(res?.message || 'Failed to update raised hand status'));
      });
    });
  }, []);

  const sendCallReaction = useCallback((roomId, emoji) => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socket.emit('call:reaction', { roomId, emoji }, (res) => {
        if (res?.success) {
          resolve(true);
          return;
        }
        reject(new Error(res?.message || 'Failed to send reaction'));
      });
    });
  }, []);

  const onCallUserJoined = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:user-joined', cb);
    return () => socket.off('call:user-joined', cb);
  }, []);

  const onCallUserLeft = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:user-left', cb);
    return () => socket.off('call:user-left', cb);
  }, []);

  const onCallSignal = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:signal', cb);
    return () => socket.off('call:signal', cb);
  }, []);

  const onCallIncoming = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:incoming', cb);
    return () => socket.off('call:incoming', cb);
  }, []);

  const onCallRaisedHand = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:raise-hand', cb);
    return () => socket.off('call:raise-hand', cb);
  }, []);

  const onCallReaction = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:reaction', cb);
    return () => socket.off('call:reaction', cb);
  }, []);

  const onCallEnded = useCallback((cb) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('call:ended', cb);
    return () => socket.off('call:ended', cb);
  }, []);

  const value = useMemo(() => ({
    connected,
    error,
    joinChannel,
    leaveChannel,
    sendMessage,
    emitTyping,
    emitStopTyping,
    onNewMessage,
    onHistory,
    onTyping,
    onStopTyping,
    onReaction,
    onMessageUpdated,
    onMessageDeleted,
    onThreadMessage,
    onNotification,
    joinCall,
    leaveCall,
    sendCallSignal,
    inviteCall,
    respondToCall,
    endCall,
    setRaisedHand,
    sendCallReaction,
    onCallUserJoined,
    onCallUserLeft,
    onCallSignal,
    onCallIncoming,
    onCallRaisedHand,
    onCallReaction,
    onCallEnded,
    socket: socketRef.current,
  }), [
    connected,
    error,
    joinChannel,
    leaveChannel,
    sendMessage,
    emitTyping,
    emitStopTyping,
    onNewMessage,
    onHistory,
    onTyping,
    onStopTyping,
    onReaction,
    onMessageUpdated,
    onMessageDeleted,
    onThreadMessage,
    onNotification,
    joinCall,
    leaveCall,
    sendCallSignal,
    inviteCall,
    respondToCall,
    endCall,
    setRaisedHand,
    sendCallReaction,
    onCallUserJoined,
    onCallUserLeft,
    onCallSignal,
    onCallIncoming,
    onCallRaisedHand,
    onCallReaction,
    onCallEnded
  ]);

  return value;
}
