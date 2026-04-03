import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSockets, disconnectSockets, getChatSocket, getNotifSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [chatSocket, setChatSocket] = useState(null);
  const [notifSocket, setNotifSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      disconnectSockets();
      setChatSocket(null);
      setNotifSocket(null);
      setConnected(false);
      return;
    }

    const { chatSocket: cs, notifSocket: ns } = initSockets(token);
    setChatSocket(cs);
    setNotifSocket(ns);

    cs.on('connect', () => setConnected(true));
    cs.on('disconnect', () => setConnected(false));

    return () => {
      disconnectSockets();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ chatSocket, notifSocket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

export default SocketContext;
