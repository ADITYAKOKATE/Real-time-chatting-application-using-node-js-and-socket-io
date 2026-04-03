import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

const usePresence = (initialUsers = []) => {
  const { chatSocket } = useSocket();
  const [presenceMap, setPresenceMap] = useState(() => {
    const map = {};
    initialUsers.forEach((u) => { map[u._id] = { status: u.status, lastSeen: u.lastSeen }; });
    return map;
  });

  useEffect(() => {
    if (!chatSocket) return;

    const onPresenceUpdate = ({ userId, status, lastSeen }) => {
      setPresenceMap((prev) => ({ ...prev, [userId]: { status, lastSeen } }));
    };

    chatSocket.on('presence:update', onPresenceUpdate);
    return () => chatSocket.off('presence:update', onPresenceUpdate);
  }, [chatSocket]);

  const getStatus = (userId) => presenceMap[userId]?.status || 'OFFLINE';
  const getLastSeen = (userId) => presenceMap[userId]?.lastSeen;

  return { presenceMap, getStatus, getLastSeen };
};

export default usePresence;
