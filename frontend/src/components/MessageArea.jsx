import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

const MessageArea = ({ messages }) => {
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <main className="chat-area">
            {messages.map((msg, index) => (
                msg.type === 'system' ? (
                    <div key={index} className="system-msg">
                        {msg.text}
                    </div>
                ) : (
                    <div 
                        key={index} 
                        className={`message ${msg.position}`}
                    >
                        {msg.sender && <span className="sender-name">{msg.sender}</span>}
                        <div className="message-content">{msg.text}</div>
                        <div className="message-footer">
                            <span className="timestamp">{msg.timestamp}</span>
                            {msg.position === 'right' && <Check size={14} color="#53bdeb" />}
                        </div>
                    </div>
                )
            ))}
            <div ref={chatEndRef} />
        </main>
    );
};

export default MessageArea;
