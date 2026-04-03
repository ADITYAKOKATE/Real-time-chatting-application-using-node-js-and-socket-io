import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

const useMessages = (channelId) => {
  const { chatSocket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const initialLoaded = useRef(false);

  // Initial load
  useEffect(() => {
    if (!channelId) return;
    initialLoaded.current = false;
    setMessages([]);
    setNextCursor(null);
    setHasMore(true);
    loadMessages(null, true);
  }, [channelId]);

  // Socket listeners
  useEffect(() => {
    if (!chatSocket || !channelId) return;

    chatSocket.emit('channel:join', { channelId });

    const onNewMessage = ({ message }) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    const onEdited = ({ message }) => {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    };

    const onDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, content: 'This message was deleted', deletedAt: new Date() } : m))
      );
    };

    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const onReadReceipt = ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, readBy: [...(m.readBy || []), { userId, readAt: new Date() }] }
            : m
        )
      );
    };

    chatSocket.on('message:new', onNewMessage);
    chatSocket.on('message:edited', onEdited);
    chatSocket.on('message:deleted', onDeleted);
    chatSocket.on('message:reaction', onReaction);
    chatSocket.on('message:readReceipt', onReadReceipt);

    return () => {
      chatSocket.emit('channel:leave', { channelId });
      chatSocket.off('message:new', onNewMessage);
      chatSocket.off('message:edited', onEdited);
      chatSocket.off('message:deleted', onDeleted);
      chatSocket.off('message:reaction', onReaction);
      chatSocket.off('message:readReceipt', onReadReceipt);
    };
  }, [chatSocket, channelId]);

  const loadMessages = useCallback(async (cursor = null, isInitial = false) => {
    if (loading) return;
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (cursor) params.before = cursor;

      const res = await api.get(`/channels/${channelId}/messages`, { params });
      const { messages: fetched, hasMore: more, nextCursor: newCursor } = res.data;

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m._id));
        const newMsgs = fetched.filter((m) => !existing.has(m._id));
        return isInitial ? fetched : [...newMsgs, ...prev];
      });

      setHasMore(more);
      setNextCursor(newCursor);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
      initialLoaded.current = true;
    }
  }, [channelId, loading]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      loadMessages(nextCursor);
    }
  }, [hasMore, nextCursor, loading, loadMessages]);

  const sendMessage = useCallback(
    (content, options = {}) => {
      if (!chatSocket || !channelId) return;
      chatSocket.emit('message:send', {
        channelId,
        content,
        type: options.type || 'text',
        replyTo: options.replyTo || null,
        file: options.file || null,
        isEncrypted: options.isEncrypted || false,
        ciphertext: options.ciphertext || null,
        iv: options.iv || null,
      });
    },
    [chatSocket, channelId]
  );

  const editMessage = useCallback(
    (messageId, content) => {
      chatSocket?.emit('message:edit', { messageId, channelId, content });
    },
    [chatSocket, channelId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      chatSocket?.emit('message:delete', { messageId, channelId });
    },
    [chatSocket, channelId]
  );

  const reactToMessage = useCallback(
    (messageId, emoji) => {
      chatSocket?.emit('message:react', { messageId, channelId, emoji });
    },
    [chatSocket, channelId]
  );

  const markAsRead = useCallback(
    (messageId) => {
      chatSocket?.emit('message:read', { messageId, channelId });
    },
    [chatSocket, channelId]
  );

  return {
    messages, loading, hasMore,
    loadMore, sendMessage, editMessage, deleteMessage, reactToMessage, markAsRead,
  };
};

export default useMessages;
