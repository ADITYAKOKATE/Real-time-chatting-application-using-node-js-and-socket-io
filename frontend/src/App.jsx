import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import ChatHeader from './components/ChatHeader';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import JoinScreen from './components/JoinScreen';
import './App.css';

const socket = io('http://localhost:8000');
const audio = new Audio('/notification.mp3');

function App() {
    const [messages, setMessages] = useState([]);
    const [userName, setUserName] = useState('');
    const [isJoined, setIsJoined] = useState(false);

    const getTimestamp = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        socket.on('user-joined', (name) => {
            setMessages((prev) => [...prev, { 
                text: `${name} joined the chat`, 
                type: 'system',
                timestamp: getTimestamp()
            }]);
        });

        socket.on('receive', (data) => {
            setMessages((prev) => [...prev, { 
                text: data.message, 
                sender: data.name,
                position: 'left',
                timestamp: getTimestamp()
            }]);
            audio.play().catch(e => console.log("Audio play deferred until user interaction"));
        });

        socket.on('left', (name) => {
            if (name) {
                setMessages((prev) => [...prev, { 
                    text: `${name} left the chat`, 
                    type: 'system',
                    timestamp: getTimestamp()
                }]);
            }
        });

        return () => {
            socket.off('user-joined');
            socket.off('receive');
            socket.off('left');
        };
    }, []);

    const handleJoin = (name) => {
        setUserName(name);
        socket.emit('new-user-joined', name);
        setIsJoined(true);
    };

    const handleSendMessage = (text) => {
        const timestamp = getTimestamp();
        setMessages((prev) => [...prev, { 
            text: text, 
            position: 'right',
            timestamp: timestamp
        }]);
        socket.emit('send', text);
    };

    if (!isJoined) {
        return <JoinScreen onJoin={handleJoin} />;
    }

    return (
        <div className="app-container">
            <ChatHeader />
            <MessageArea messages={messages} />
            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    );
}

export default App;
