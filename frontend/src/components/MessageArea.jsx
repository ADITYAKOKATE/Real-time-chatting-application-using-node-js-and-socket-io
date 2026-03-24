import React, { useEffect, useRef } from 'react';

const MessageArea = ({ messages }) => {
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <main className="chat-area bg">
            {messages.map((msg, index) => (
                <div 
                    key={index} 
                    className={`message ${msg.position} ${msg.type ? msg.type : ''}`}
                >
                    {msg.text}
                </div>
            ))}
            <div ref={chatEndRef} />
        </main>
    );
};

export default MessageArea;
