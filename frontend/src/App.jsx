import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import ChatHeader from './components/ChatHeader';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import './App.css';

const socket = io('http://localhost:8000');
const audio = new Audio('/notification.mp3');

function App() {
    const [messages, setMessages] = useState([]);
    const [userName, setUserName] = useState('');
    const [isJoined, setIsJoined] = useState(false);

    useEffect(() => {
        if (!isJoined) {
            const name = prompt('Enter your name to join');
            if (name) {
                setUserName(name);
                socket.emit('new-user-joined', name);
                setIsJoined(true);
            }
        }
    }, [isJoined]);

    useEffect(() => {
        socket.on('user-joined', (name) => {
            setMessages((prev) => [...prev, { text: `${name} joined the chat`, position: 'center', type: 'joined' }]);
        });

        socket.on('receive', (data) => {
            setMessages((prev) => [...prev, { text: `${data.name}: ${data.message}`, position: 'left' }]);
            audio.play().catch(e => console.log("Audio play deferred until user interaction"));
        });

        socket.on('left', (name) => {
            if (name) {
                setMessages((prev) => [...prev, { text: `${name} left the chat`, position: 'up', type: 'leavee' }]);
            }
        });

        return () => {
            socket.off('user-joined');
            socket.off('receive');
            socket.off('left');
        };
    }, []);

    const handleSendMessage = (text) => {
        setMessages((prev) => [...prev, { text: `You: ${text}`, position: 'right' }]);
        socket.emit('send', text);
    };

    return (
        <div className="app-container">
            <ChatHeader />
            <MessageArea messages={messages} />
            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    );
}

export default App;
