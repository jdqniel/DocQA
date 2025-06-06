import { useState, useRef, useEffect } from 'react';
import './Chat.css';

const Chat = () => {
    const [conversations, setConversations] = useState([{
        id: Date.now().toString(),
        title: 'New chat',
        messages: []
    }]);
    const [activeConversationId, setActiveConversationId] = useState(conversations[0].id);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef(null);

    const activeConversation = conversations.find(conv => conv.id === activeConversationId);
    const messages = activeConversation ? activeConversation.messages : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    const handleNewChat = () => {
        const newConversation = {
            id: Date.now().toString(),
            title: 'New chat',
            messages: []
        };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
    };

    const handleSelectConversation = (id) => {
        setActiveConversationId(id);
    };

    const handleRemoveChat = (id, e) => {
        e.stopPropagation();
        setConversations(prev => {
            const newConversations = prev.filter(conv => conv.id !== id);
            if (newConversations.length === 0) {
                const newChat = {
                    id: Date.now().toString(),
                    title: 'New chat',
                    messages: []
                };
                setActiveConversationId(newChat.id);
                return [newChat];
            }
            if (id === activeConversationId) {
                setActiveConversationId(newConversations[0].id);
            }
            return newConversations;
        });
    };

    const handleClearHistory = () => {
        if (!activeConversationId) return;
        setConversations(prev => prev.map(conv =>
            conv.id === activeConversationId
                ? { ...conv, messages: [] }
                : conv
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeConversationId) return;

        const userMessage = input.trim();
        setInput('');

        setConversations(prev => prev.map(conv =>
            conv.id === activeConversationId
                ? { ...conv, messages: [...conv.messages, { role: 'user', content: userMessage }] }
                : conv
        ));

        setStreamingMessageId(Date.now().toString());
        setStreamingContent('');
        setIsLoading(true);

        let accumulatedAssistantResponse = '';

        try {
            const response = await fetch('http://localhost:8000/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    conversation_id: activeConversationId,
                    role: 'user'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer.startsWith('data:')) {
                        const potentialLastMessage = buffer.substring(buffer.indexOf('data: ') + 6).trim();
                        if (potentialLastMessage) {
                            try {
                                const parsed = JSON.parse(potentialLastMessage);
                                if (parsed === "[DONE]") {
                                } else if (parsed.error) {
                                    accumulatedAssistantResponse += ` Error: ${parsed.error}`;
                                    setStreamingContent(prev => prev + ` Error: ${parsed.error}`);
                                } else {
                                    accumulatedAssistantResponse += parsed;
                                    setStreamingContent(prev => prev + parsed);
                                }
                            } catch (parseError) {
                                // Silent fail for parse errors
                            }
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                let eolIndex;

                while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
                    const message = buffer.slice(0, eolIndex);
                    buffer = buffer.slice(eolIndex + 2);

                    if (message.startsWith('data: ')) {
                        const jsonData = message.slice(6).trim();
                        if (jsonData) {
                            try {
                                const parsedContent = JSON.parse(jsonData);

                                if (parsedContent === "[DONE]") {
                                } else if (parsedContent.error) {
                                    accumulatedAssistantResponse += ` Error: ${parsedContent.error}`;
                                    setStreamingContent(prev => prev + ` Error: ${parsedContent.error}`);
                                } else {
                                    accumulatedAssistantResponse += parsedContent;
                                    setStreamingContent(prev => prev + parsedContent);
                                }
                            } catch (error) {
                                // Silent fail for parse errors
                            }
                        }
                    }
                }
            }

        } catch (error) {
            setStreamingContent(prev => prev + ' Sorry, there was an error processing your request.');
            accumulatedAssistantResponse += ' Sorry, there was an error processing your request.';
        } finally {
            if (activeConversationId && accumulatedAssistantResponse) {
                setConversations(prev => prev.map(conv => {
                    if (conv.id === activeConversationId) {
                        const lastMessage = conv.messages[conv.messages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === accumulatedAssistantResponse) {
                            return conv;
                        }
                        return {
                            ...conv,
                            messages: [...conv.messages, { role: 'assistant', content: accumulatedAssistantResponse }]
                        };
                    }
                    return conv;
                }));
            }

            setStreamingMessageId(null);
            setIsLoading(false);
            scrollToBottom();
        }
    };

    return (
        <div className="app-container">
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <button
                        className="toggle-sidebar"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Toggle sidebar"
                    >
                        {/* Hamburger icon will be created with CSS pseudo-elements */}
                    </button>
                    <button className="new-chat-button" onClick={handleNewChat}>
                        <span>+</span> New chat
                    </button>
                </div>
                <div className="conversations">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
                            onClick={() => handleSelectConversation(conv.id)}
                        >
                            <span className="conversation-title">{conv.title}</span>
                            <button
                                className="remove-chat-button"
                                onClick={(e) => handleRemoveChat(conv.id, e)}
                                title="Remove chat"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="chat-container">
                {messages.length > 0 && (
                    <div className="chat-header">
                        <button
                            className="clear-history-button"
                            onClick={handleClearHistory}
                        >
                            Clear History
                        </button>
                    </div>
                )}
                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="welcome-message">
                            <h1>Document Chat</h1>
                            <p>Ask me anything about the document!</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div key={index} className={`message-wrapper ${message.role}`}>
                                <div className="message-container">
                                    <div className="message-content">
                                        {message.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {streamingMessageId && (
                        <div className="message-wrapper assistant">
                            <div className="message-container">
                                <div className="message-content">
                                    {streamingContent}
                                    <span className="cursor" style={{
                                        opacity: streamingContent ? 1 : 0,
                                        animation: 'blink 1s infinite',
                                        marginLeft: '2px'
                                    }}>|</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="input-container">
                    <form onSubmit={handleSubmit} className="input-form">
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Document Chat..."
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="send-button"
                            >
                                {isLoading ? (
                                    <span className="loading-dots">...</span>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" className="send-icon">
                                        <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Chat;