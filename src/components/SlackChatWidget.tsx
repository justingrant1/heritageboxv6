import React, { useState, useEffect, useRef } from 'react';

const SlackChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      sender: 'bot',
      text: `Hi! I'm your Heritagebox AI assistant. I can help you with:

📸 Photo digitization pricing
📹 Video transfer options
📦 Project status updates
⏰ Turnaround times

What would you like to know?`,
      showQuickActions: true
    }
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState('ai'); // 'ai', 'human', 'resolved'
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && conversationId && conversationStatus === 'human') {
      const interval = setInterval(() => {
        fetch(`/api/chat-poll?conversationId=${conversationId}`)
          .then((res) => res.json())
          .then((data) => {
            setChatHistory(data.messages);
            if (data.status === 'resolved') {
              setConversationStatus('resolved');
            }
          });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, conversationId, conversationStatus]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user', text: textToSend }];
    setChatHistory(newHistory);
    setMessage('');

    if (conversationStatus === 'ai') {
      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, chatHistory: chatHistory }),
      });
      const data = await response.json();
      setChatHistory([...newHistory, { sender: 'bot', text: data.response }]);
    } else {
      await fetch('/api/send-to-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: textToSend }),
      });
    }
  };

  const handleQuickAction = (actionText: string) => {
    handleSendMessage(actionText);
  };

  const handleHumanRequest = async () => {
    setConversationStatus('human');
    const humanRequestMessage = "I'd like to talk to a human.";
    const newHistory = [...chatHistory, { sender: 'user', text: humanRequestMessage }];
    setChatHistory(newHistory);

    const response = await fetch('/api/slack-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Guest',
        customerEmail: 'guest@example.com',
        initialMessage: humanRequestMessage,
        chatHistory: newHistory,
      }),
    });
    const data = await response.json();
    setConversationId(data.conversationId);
  };

  return (
    <div className="chat-widget">
      <button className="chat-toggle" onClick={toggleChat}>
        {isOpen ? '✕' : '💬'}
      </button>
      {isOpen && (
        <div className="chat-window open">
          <div className="chat-header">
            <div className="chat-avatar">🎞️</div>
            <div className="chat-info">
              <h3>Heritagebox Assistant</h3>
              <p>Here to help with your digitization needs</p>
            </div>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-content">{msg.text}</div>
                {msg.showQuickActions && conversationStatus === 'ai' && (
                  <div className="quick-actions" style={{ marginTop: '10px' }}>
                    <button className="quick-action" onClick={() => handleQuickAction('What are your photo pricing options?')}>
                      Photo Pricing
                    </button>
                    <button className="quick-action" onClick={() => handleQuickAction('Check my order status')}>
                      Order Status
                    </button>
                    <button className="quick-action" onClick={() => handleQuickAction('What video transfer options do you have?')}>
                      Video Transfer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <div className="input-container">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="send-button" onClick={() => handleSendMessage()}>
                ➤
              </button>
            </div>
            <div className="quick-actions">
              {conversationStatus === 'ai' && (
                <button className="quick-action" onClick={handleHumanRequest}>
                  Talk to a Human
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlackChatWidget;
