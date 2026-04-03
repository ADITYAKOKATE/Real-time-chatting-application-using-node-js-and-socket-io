import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const useTyping = (channelId) => {
  const { chatSocket } = useSocket();
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!chatSocket || !channelId) return;

    const onTypingStart = ({ userId, username }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    };

    const onTypingStop = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    chatSocket.on('typing:start', onTypingStart);
    chatSocket.on('typing:stop', onTypingStop);

    return () => {
      chatSocket.off('typing:start', onTypingStart);
      chatSocket.off('typing:stop', onTypingStop);
    };
  }, [chatSocket, channelId, user]);

  const startTyping = useCallback(() => {
    if (!chatSocket || !channelId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      chatSocket.emit('typing:start', { channelId });
    }

    // Debounce: stop after 2s of no keystrokes
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      chatSocket.emit('typing:stop', { channelId });
    }, 2000);
  }, [chatSocket, channelId]);

  const stopTyping = useCallback(() => {
    if (!chatSocket || !channelId) return;
    clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    chatSocket.emit('typing:stop', { channelId });
  }, [chatSocket, channelId]);

  return { typingUsers, startTyping, stopTyping };
};

export default useTyping;
