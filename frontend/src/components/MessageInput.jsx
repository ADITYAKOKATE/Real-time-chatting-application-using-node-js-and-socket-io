import React, { useState } from 'react';
import { Smile, Paperclip, Send } from 'lucide-react';

const MessageInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (trimmedMessage) {
            onSendMessage(trimmedMessage);
            setMessage('');
        }
    };

    return (
        <footer id="send-container">
            <form onSubmit={handleSubmit}>
                <div className="input-wrapper">
                    <button type="button" className="icon-btn"><Smile size={20} /></button>
                    <button type="button" className="icon-btn"><Paperclip size={20} /></button>
                    <input 
                        type="text" 
                        placeholder="Type a message" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        autoComplete="off" 
                        id="messageinp"
                    />
                </div>
                <button className="btn" type="submit">
                    <Send size={18} />
                </button>
            </form>
        </footer>
    );
};

export default MessageInput;
