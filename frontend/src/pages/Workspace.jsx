import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import useMessages from '../hooks/useMessages';
import useTyping from '../hooks/useTyping';
import usePresence from '../hooks/usePresence';
import '../styles/workspace.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const getInitials = (name = '') => name.slice(0, 2).toUpperCase();

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FILE_ICONS = { image: '🖼️', video: '🎬', pdf: '📄', text: '📝', default: '📎' };
const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image')) return FILE_ICONS.image;
  if (mimeType.startsWith('video')) return FILE_ICONS.video;
  if (mimeType.includes('pdf')) return FILE_ICONS.pdf;
  if (mimeType.startsWith('text')) return FILE_ICONS.text;
  return FILE_ICONS.default;
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

// ─── Markdown Lite ────────────────────────────────────────────────────────────
const renderContent = (content = '') => {
  if (!content) return '';
  
  // Basic patterns: **bold**, _italic_, `code`
  const parts = content.split(/(\*\*.*?\*\*|_.*?_|`.*?`)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ user, status }) => (
  <div className="message-avatar">
    {getInitials(user?.username)}
    <span className={`presence-dot ${(status || user?.status || 'offline').toLowerCase()}`} />
  </div>
);

// ─── MessageItem ──────────────────────────────────────────────────────────────
const MessageItem = ({ message, currentUser, onReact, onEdit, onDelete, getStatus }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const isOwn = message.senderId?._id === currentUser?._id;
  const isDeleted = !!message.deletedAt;
  const status = getStatus(message.senderId?._id);

  const handleEdit = () => {
    if (editText.trim()) {
      onEdit(message._id, editText.trim());
      setEditing(false);
    }
  };

  return (
    <div className="message-item" id={`msg-${message._id}`}>
      <Avatar user={message.senderId} status={status} />
      <div className="message-body">
        <div className="message-meta">
          <span className="message-sender">{message.senderId?.username}</span>
          <span className="message-time">{formatTime(message.createdAt)}</span>
          {message.editedAt && <span className="message-edited">(edited)</span>}
          {message.isEncrypted && <span className="e2e-badge">🔒 E2E</span>}
        </div>

        {editing ? (
          <div className="edit-input-wrap">
            <textarea
              className="message-textarea"
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid var(--accent)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', resize: 'vertical', minHeight: 60 }}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditing(false); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button className="modal-btn-primary" style={{ fontSize: '0.75rem', padding: '3px 10px' }} onClick={handleEdit}>Save</button>
              <button className="modal-btn-cancel" style={{ fontSize: '0.75rem', padding: '3px 10px' }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={`message-content ${isDeleted ? 'deleted' : ''}`}>
            {isDeleted ? '🚫 This message was deleted' : renderContent(message.content)}
          </div>
        )}

        {/* File attachment */}
        {message.file && (
          <div className="file-attachment-wrap">
            {message.file.mimeType?.startsWith('image') ? (
              <img
                src={message.file.thumbnailUrl || message.file.url}
                alt={message.file.name}
                style={{ maxWidth: 320, maxHeight: 240, borderRadius: 8, marginTop: 6, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => window.open(message.file.url, '_blank')}
              />
            ) : message.file.mimeType?.startsWith('video') ? (
              <div className="video-preview-wrap" style={{ position: 'relative', marginTop: 6, maxWidth: 320 }}>
                <video
                  src={message.file.url}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                  controls
                />
                {message.file.videoMeta && (
                  <div className="video-duration" style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
                    {Math.floor(message.file.videoMeta.duration / 60)}:{(message.file.videoMeta.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            ) : (
              <a className="file-attachment" href={message.file.url} target="_blank" rel="noreferrer">
                <span className="file-icon">{getFileIcon(message.file.mimeType)}</span>
                <div className="file-info">
                  <div className="file-name">{message.file.name}</div>
                  <div className="file-size">{formatFileSize(message.file.size)}</div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Link previews */}
        {message.linkPreviews?.map((lp, i) => lp.title && (
          <a key={i} className="link-preview" href={lp.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
            <div className="link-preview-site">{lp.siteName || lp.url}</div>
            <div className="link-preview-title">{lp.title}</div>
            {lp.description && <div className="link-preview-desc">{lp.description}</div>}
            {lp.image && <img src={lp.image} alt="preview" />}
          </a>
        ))}

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                className={`reaction-chip ${r.users?.some(u => (u._id || u) === currentUser?._id) ? 'mine' : ''}`}
                onClick={() => onReact(message._id, r.emoji)}
              >
                {r.emoji}
                <span className="reaction-count">{r.users?.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!isDeleted && (
        <div className="message-actions">
          {QUICK_REACTIONS.map(e => (
            <button key={e} className="message-action-btn" title={e} onClick={() => onReact(message._id, e)}>{e}</button>
          ))}
          {isOwn && (
            <>
              <button className="message-action-btn" title="Edit" onClick={() => { setEditing(true); setEditText(message.content); }}>✏️</button>
              <button className="message-action-btn" title="Delete" onClick={() => onDelete(message._id)}>🗑️</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── TypingIndicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ typingUsers }) => {
  if (typingUsers.length === 0) return <div className="typing-indicator" />;
  const names = typingUsers.map(u => u.username).join(', ');
  const verb = typingUsers.length === 1 ? 'is' : 'are';
  return (
    <div className="typing-indicator">
      <div className="typing-dots"><span/><span/><span/></div>
      <span>{names} {verb} typing…</span>
    </div>
  );
};

// ─── MessageInput ─────────────────────────────────────────────────────────────
const MessageInput = ({ channelId, onSend, onTyping, onStopTyping }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const textareaRef = useRef();

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    onStopTyping();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value) onTyping(); else onStopTyping();
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`; }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/files/upload', formData);
      onSend('', { type: 'file', file: res.data.file });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="message-input-area">
      <div className="message-input-box">
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
        <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Attach file" disabled={uploading}>
          {uploading ? '⏳' : '📎'}
        </button>
        <textarea
          ref={textareaRef}
          id="message-input"
          className="message-textarea"
          placeholder="Message…"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button className="send-btn" onClick={handleSend} disabled={!text.trim() && !uploading} title="Send">
          ➤
        </button>
      </div>
    </div>
  );
};

// ─── ChannelView ──────────────────────────────────────────────────────────────
const ChannelView = ({ channel, currentUser }) => {
  const { messages, loading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, reactToMessage, markAsRead } =
    useMessages(channel._id);
  const { typingUsers, startTyping, stopTyping } = useTyping(channel._id);
  const { getStatus } = usePresence(channel.members || []);
  const bottomRef = useRef();
  const listRef = useRef();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark last message as read
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last) markAsRead(last._id);
  }, [messages.length]);

  // Infinite scroll (auto-load)
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loading) {
      const prevHeight = e.target.scrollHeight;
      loadMore().then(() => {
          // Adjust scroll to maintain position after loading more
          setTimeout(() => {
              if (listRef.current) {
                  listRef.current.scrollTop = listRef.current.scrollHeight - prevHeight;
              }
          }, 0);
      });
    }
  };

  const handleSend = useCallback((content, options = {}) => {
    sendMessage(content, options);
  }, [sendMessage]);

  // Group messages by date
  const grouped = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = formatDateLabel(msg.createdAt);
    if (d !== lastDate) { grouped.push({ type: 'divider', label: d }); lastDate = d; }
    grouped.push({ type: 'message', message: msg });
  }

  const isDM = channel.isDM;
  const channelTitle = isDM
    ? channel.members?.find(m => m._id !== currentUser?._id)?.username || 'DM'
    : `# ${channel.name}`;

  return (
    <>
      {/* Header */}
      <div className="channel-header">
        <span className="channel-header-hash">{isDM ? '🔐' : '#'}</span>
        <span className="channel-header-name">{isDM ? channelTitle : channel.name}</span>
        {isDM && <span className="e2e-status-badge" style={{ fontSize: '0.65rem', background: '#00a884', color: 'white', padding: '1px 6px', borderRadius: 10, marginLeft: 8 }}>E2E Encrypted</span>}
        {channel.description && <span className="channel-header-desc">— {channel.description}</span>}
        <div className="channel-header-members">
          <span>👥</span>
          <span>{channel.members?.length} members</span>
        </div>
      </div>

      {/* Messages */}
      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        {hasMore && (
          <div className="loading-spinner">
            {loading ? '⏳ Loading previous messages…' : ''}
          </div>
        )}

        {grouped.map((item, i) =>
          item.type === 'divider' ? (
            <div key={`div-${i}`} className="date-divider">{item.label}</div>
          ) : (
            <MessageItem
              key={item.message._id}
              message={item.message}
              currentUser={currentUser}
              onReact={reactToMessage}
              onEdit={editMessage}
              onDelete={deleteMessage}
              getStatus={getStatus}
            />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <MessageInput
        channelId={channel._id}
        onSend={handleSend}
        onTyping={startTyping}
        onStopTyping={stopTyping}
      />
    </>
  );
};

// ─── NewChannelModal ──────────────────────────────────────────────────────────
const NewChannelModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const res = await api.post('/channels', { name: name.trim().toLowerCase().replace(/\s+/g, '-'), description: desc, isPrivate });
      onCreate(res.data.channel);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Create a Channel</div>
        <input className="modal-input" placeholder="channel-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="modal-input" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          Private channel
        </label>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button id="create-channel-btn" className="modal-btn-primary" onClick={handleCreate} disabled={!name.trim()}>Create</button>
        </div>
      </div>
    </div>
  );
};

// ─── Workspace (Main Page) ────────────────────────────────────────────────────
const Workspace = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const res = await api.get('/channels');
      setChannels(res.data.channels);
      if (res.data.channels.length > 0 && !activeChannel) {
        setActiveChannel(res.data.channels[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const publicChannels = channels.filter(c => !c.isDM);
  const dmChannels = channels.filter(c => c.isDM);

  const getDMName = (ch) => ch.members?.find(m => m._id !== user?._id)?.username || 'Unknown';

  return (
    <div className="workspace">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-workspace-name">⚡ SlackClone</span>
          <span style={{ fontSize: '0.7rem', color: connected ? 'var(--online)' : 'var(--offline)' }}>
            {connected ? '● Live' : '○ Offline'}
          </span>
        </div>

        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Search messages…" readOnly />
        </div>

        {/* Channels */}
        <div className="sidebar-section" style={{ flex: '0 0 auto' }}>
          <div className="sidebar-section-label">
            Channels
            <button className="sidebar-add-btn" id="new-channel-btn" onClick={() => setShowNewChannel(true)} title="New channel">+</button>
          </div>
          <ul className="sidebar-channels">
            {publicChannels.map(ch => (
              <li
                key={ch._id}
                className={`sidebar-channel-item ${activeChannel?._id === ch._id ? 'active' : ''}`}
                onClick={() => setActiveChannel(ch)}
                id={`channel-${ch._id}`}
              >
                <span className="sidebar-channel-hash">#</span>
                <span className="sidebar-channel-name">{ch.name}</span>
                {unreadMap[ch._id] > 0 && <span className="sidebar-unread-badge">{unreadMap[ch._id]}</span>}
              </li>
            ))}
            {publicChannels.length === 0 && (
              <li style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No channels yet
              </li>
            )}
          </ul>
        </div>

        {/* DMs */}
        {dmChannels.length > 0 && (
          <div className="sidebar-section" style={{ flex: '0 0 auto', marginTop: 8 }}>
            <div className="sidebar-section-label">Direct Messages</div>
            <ul className="sidebar-channels">
              {dmChannels.map(ch => (
                <li
                  key={ch._id}
                  className={`sidebar-dm-item sidebar-channel-item ${activeChannel?._id === ch._id ? 'active' : ''}`}
                  onClick={() => setActiveChannel(ch)}
                >
                  <span>💬</span>
                  <span className="sidebar-channel-name">{getDMName(ch)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* User */}
        <div className="sidebar-user">
          <div className="message-avatar" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
            {getInitials(user?.username)}
            <span className="presence-dot online" />
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{user?.username}</div>
            <div className="sidebar-user-status">Active</div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout} title="Sign out">⎋</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="channel-view">
        {activeChannel ? (
          <ChannelView channel={activeChannel} currentUser={user} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-title">Welcome to SlackClone</div>
            <div className="empty-state-sub">Select a channel or create one to get started</div>
            <button className="modal-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowNewChannel(true)}>
              Create your first channel
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          onCreate={(ch) => {
            setChannels(prev => [ch, ...prev]);
            setActiveChannel(ch);
          }}
        />
      )}
    </div>
  );
};

export default Workspace;
