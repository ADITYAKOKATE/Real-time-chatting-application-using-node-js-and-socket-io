import React, { useState } from 'react';
import { Smile, Plus, Mic, Send } from 'lucide-react';

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
                <button type="button" className="icon-btn"><Smile size={24} /></button>
                <button type="button" className="icon-btn"><Plus size={24} /></button>
                <div className="input-wrapper">
                    <input 
                        type="text" 
                        placeholder="Type a message" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        autoComplete="off" 
                        id="messageinp"
                    />
                </div>
                {message.trim() ? (
                    <button className="send-btn" type="submit">
                        <Send size={24} />
                    </button>
                ) : (
                    <button type="button" className="icon-btn">
                        <Mic size={24} />
                    </button>
                )}
            </form>
        </footer>
    );
};

export default MessageInput;
