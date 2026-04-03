import React from 'react';
import { Search, MoreVertical, Phone, Video, ShieldCheck } from 'lucide-react';

const ChatHeader = () => {
    return (
        <header className="main-header">
            <div className="user-info">
                <div className="avatar">
                    <img src="https://ui-avatars.com/api/?name=Chat+Room&background=00a884&color=fff" alt="Avatar" />
                </div>
                <div className="details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h1>WhatsApp Global Chat</h1>
                        <ShieldCheck size={14} color="#00a884" title="End-to-End Encrypted" />
                    </div>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#00a884', borderRadius: '50%' }}></span>
                        online
                    </p>
                </div>
            </div>
            <div className="header-actions">
                <button className="icon-btn"><Video size={20} /></button>
                <button className="icon-btn"><Phone size={20} /></button>
                <div className="divider"></div>
                <button className="icon-btn"><Search size={20} /></button>
                <button className="icon-btn"><MoreVertical size={20} /></button>
            </div>
        </header>
    );
};

export default ChatHeader;
