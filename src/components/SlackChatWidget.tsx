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
  const [humanHandoffStep, setHumanHandoffStep] = useState<'email' | 'question' | 'connecting' | 'connected' | null>(null);
  const [collectedEmail, setCollectedEmail] = useState('');
  const [collectedQuestion, setCollectedQuestion] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    if (isOpen && conversationId && conversationStatus === 'human' && humanHandoffStep === 'connected') {
      const interval = setInterval(() => {
        fetch(`/api/chat-poll?conversationId=${conversationId}`)
          .then((res) => res.json())
          .then((data) => {
            // Only update if we have messages from the server
            if (data.messages && data.messages.length > 0) {
              setChatHistory(data.messages);
            }
            if (data.status === 'resolved') {
              setConversationStatus('resolved');
            }
          })
          .catch((error) => {
            console.error('Error polling chat:', error);
          });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, conversationId, conversationStatus, humanHandoffStep]);

  useEffect(() => {
    // Only auto-scroll if new messages were added and user isn't manually scrolling
    if (chatMessagesRef.current && !isUserScrolling && chatHistory.length > lastMessageCountRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
    lastMessageCountRef.current = chatHistory.length;
  }, [chatHistory, isUserScrolling]);

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
    
    // If user scrolled up from bottom, they're manually scrolling
    if (!isAtBottom) {
      setIsUserScrolling(true);
    } else {
      // If they scrolled back to bottom, resume auto-scroll
      setIsUserScrolling(false);
    }
  };

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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleHumanRequest = () => {
    setHumanHandoffStep('email');
    const newHistory = [...chatHistory, 
      { sender: 'user', text: "I'd like to talk to a human." },
      { sender: 'bot', text: "I'd be happy to connect you with our team! To get started, please provide your email address:" }
    ];
    setChatHistory(newHistory);
  };

  const handleEmailSubmit = async () => {
    if (!collectedEmail.trim()) {
      setEmailError('Please enter your email address');
      return;
    }
    if (!validateEmail(collectedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setEmailError('');
    
    // Save email to Prospects table
    try {
      await fetch('/api/save-prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: collectedEmail,
          source: 'Website Chat',
          message: 'Customer requested human support via chat widget',
          pageUrl: window.location.href
        }),
      });
    } catch (error) {
      console.error('Error saving prospect:', error);
      // Continue with the flow even if prospect saving fails
    }
    
    setHumanHandoffStep('question');
    const newHistory = [...chatHistory, 
      { sender: 'user', text: collectedEmail },
      { sender: 'bot', text: "Thanks! Now, how can we help you today? Please describe what you need assistance with:" }
    ];
    setChatHistory(newHistory);
  };

  const handleQuestionSubmit = async () => {
    if (!collectedQuestion.trim()) {
      return;
    }

    setHumanHandoffStep('connecting');
    const newHistory = [...chatHistory, 
      { sender: 'user', text: collectedQuestion },
      { sender: 'bot', text: "Perfect! We're connecting you with our team now. Someone will be with you shortly..." }
    ];
    setChatHistory(newHistory);

    // Now send to Slack with real customer data
    const response = await fetch('/api/slack-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: collectedEmail.split('@')[0], // Use email prefix as name
        customerEmail: collectedEmail,
        initialMessage: collectedQuestion,
        chatHistory: newHistory,
      }),
    });
    const data = await response.json();
    setConversationId(data.conversationId);
    setConversationStatus('human');
    setHumanHandoffStep('connected');
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
          <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
            {chatHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-content">{msg.text}</div>
              </div>
            ))}
            {conversationStatus === 'ai' && chatHistory.length === 1 && (
              <div className="quick-actions">
                <button className="quick-action" onClick={() => handleQuickAction('How much does photo scanning cost?')}>
                  Photo Pricing
                </button>
                <button className="quick-action" onClick={() => handleQuickAction('Check my order status')}>
                  Order Status
                </button>
                <button className="quick-action" onClick={() => handleQuickAction('Video transfer options')}>
                  Video Transfer
                </button>
              </div>
            )}
          </div>
          <div className="chat-input">
            {humanHandoffStep === 'email' ? (
              <div className="input-container">
                <input
                  type="email"
                  value={collectedEmail}
                  onChange={(e) => setCollectedEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                  style={{ borderColor: emailError ? '#ff4444' : '#eee' }}
                />
                <button className="send-button" onClick={handleEmailSubmit}>
                  ➤
                </button>
              </div>
            ) : humanHandoffStep === 'question' ? (
              <div className="input-container">
                <input
                  type="text"
                  value={collectedQuestion}
                  onChange={(e) => setCollectedQuestion(e.target.value)}
                  placeholder="How can we help you today?"
                  onKeyPress={(e) => e.key === 'Enter' && handleQuestionSubmit()}
                />
                <button className="send-button" onClick={handleQuestionSubmit}>
                  ➤
                </button>
              </div>
            ) : humanHandoffStep === 'connecting' ? (
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Please wait while we connect you..."
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <button className="send-button" disabled style={{ opacity: 0.6 }}>
                  ➤
                </button>
              </div>
            ) : (
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
            )}
            {emailError && (
              <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
                {emailError}
              </div>
            )}
          </div>
          {conversationStatus === 'ai' && !humanHandoffStep && (
            <div className="chat-footer" style={{ padding: '10px 20px', borderTop: '1px solid #eee' }}>
              <button 
                className="quick-action" 
                onClick={handleHumanRequest}
                style={{ width: '100%', textAlign: 'center' }}
              >
                Talk to a Human
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SlackChatWidget;
