import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  // Helper to add toast notification
  const addToast = useCallback((title, message, type = 'info', ticketId = null) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type, ticketId }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const connectSocket = useCallback((token) => {
    if (socketRef.current) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    let socketUrl = 'http://localhost:5000';
    try {
      const parsed = new URL(API_URL);
      socketUrl = parsed.origin;
    } catch (e) {
      // Fallback to default
    }
    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      console.log('Socket.IO connection established:', s.id);
    });

    s.on('connect_error', (err) => {
      console.warn('Socket.IO connection error:', err.message);
      // Auto reconnect will trigger, but if authorization is explicitly denied:
      if (err.message.includes('Authentication failed')) {
        console.error('Socket Authentication failed. Expired or invalid JWT.');
        // Trigger manual session cleanup if needed
      }
    });

    // Listen globally for push notifications
    s.on('notification', (payload) => {
      const { title, message, type, ticketId } = payload.data || {};
      addToast(title, message, type, ticketId);
    });

    socketRef.current = s;
    setSocket(s);
  }, [addToast]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connectSocket, disconnectSocket, toasts, addToast }}>
      {children}
      
      {/* Floating Toast Notification Overlay */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-3rem)] pointer-events-none">
        {toasts.map((t) => {
          let bgColor = 'bg-slate-900/90 border-slate-700/50';
          let iconColor = 'text-blue-400';
          let icon = 'ℹ️';

          if (t.type === 'success') {
            bgColor = 'bg-emerald-950/90 border-emerald-500/25';
            iconColor = 'text-emerald-400';
            icon = '✅';
          } else if (t.type === 'error' || t.type === 'danger') {
            bgColor = 'bg-rose-950/90 border-rose-500/25';
            iconColor = 'text-rose-400';
            icon = '🚨';
          } else if (t.type === 'warning') {
            bgColor = 'bg-amber-950/90 border-amber-500/25';
            iconColor = 'text-amber-400';
            icon = '⚠️';
          }

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border ${bgColor} shadow-xl backdrop-blur-md text-xs pointer-events-auto cursor-pointer animate-slideIn transition transform hover:scale-[1.02] duration-150`}
              onClick={() => {
                if (t.ticketId) {
                  // Direct link redirect handler or state selection trigger
                  window.location.href = `/tickets?id=${t.ticketId}`;
                }
              }}
            >
              <div className={`text-base leading-none select-none ${iconColor}`}>
                {icon}
              </div>
              <div className="flex-1 space-y-0.5">
                <h5 className="font-bold text-gray-100">{t.title}</h5>
                <p className="text-gray-400 leading-relaxed font-sans">{t.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
