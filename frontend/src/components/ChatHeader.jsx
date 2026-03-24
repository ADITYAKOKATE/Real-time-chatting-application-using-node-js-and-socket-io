import React from 'react';
import { Search, MoreVertical } from 'lucide-react';

const ChatHeader = () => {
    return (
        <header className="main-header">
            <div className="user-info">
                <div className="avatar">
                    <img src="https://ui-avatars.com/api/?name=Chat+Room&background=25D366&color=fff" alt="Avatar" />
                    <span className="status-dot"></span>
                </div>
                <div className="details">
                    <h1>WhatsApp Chat</h1>
                    <p>Online</p>
                </div>
            </div>
            <div className="header-actions">
                <button className="icon-btn"><Search size={18} /></button>
                <button className="icon-btn"><MoreVertical size={18} /></button>
            </div>
        </header>
    );
};

export default ChatHeader;
