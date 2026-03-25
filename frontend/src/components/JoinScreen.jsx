import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

const JoinScreen = ({ onJoin }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onJoin(name.trim());
        }
    };

    return (
        <div className="join-container">
            <div className="join-header">
                <div className="logo-icon">
                    <MessageSquare size={32} />
                </div>
                <h1>WhatsApp Clone</h1>
            </div>
            
            <div className="join-card">
                <h2>Welcome to Chat</h2>
                <p>Enter your name to start chatting with others in real-time.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Your Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Aditya" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    
                    <button type="submit" className="join-btn">
                        Join Chat
                    </button>
                </form>
            </div>
        </div>
    );
};

export default JoinScreen;
