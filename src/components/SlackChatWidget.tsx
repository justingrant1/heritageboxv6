import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const [isConnectedToAgent, setIsConnectedToAgent] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Add message helper function
  const addMessage = useCallback((text: string, sender: 'user' | 'bot', agentName?: string) => {
    const newMessage = {
      sender,
      text,
      timestamp: new Date().toISOString(),
      agentName: agentName || undefined
    };
    
    setChatHistory(prev => {
      const updated = [...prev, newMessage];
      setLastMessageCount(updated.length);
      return updated;
    });
  }, []);

  // Polling function for agent messages
  const pollForMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/chat-poll?conversationId=${conversationId}&lastMessageCount=${lastMessageCount}`);
      const data = await response.json();

      if (data.hasNewMessages && data.newMessages && data.newMessages.length > 0) {
        console.log('Received new messages:', data.newMessages);
        
        // Add new messages to the chat
        data.newMessages.forEach((msg: any) => {
          if (msg.sender === 'agent') {
            addMessage(msg.text, 'bot', msg.agent_name || 'Support Agent');
          }
        });
      }

      // Update agent connection status
      if (data.agentConnected !== isConnectedToAgent) {
        setIsConnectedToAgent(data.agentConnected);
        setAgentName(data.agentName || '');
        
        if (data.agentConnected && data.agentName && humanHandoffStep === 'connecting') {
          setHumanHandoffStep('connected');
          addMessage(`${data.agentName} has joined the conversation and will assist you.`, 'bot', data.agentName);
        }
      }

      // Update conversation status
      if (data.status === 'resolved' && conversationStatus !== 'resolved') {
        setConversationStatus('resolved');
        addMessage('This conversation has been marked as resolved. Thank you for contacting us!', 'bot');
      }

    } catch (error) {
      console.error('Error polling for messages:', error);
    }
  }, [conversationId, lastMessageCount, isConnectedToAgent, humanHandoffStep, conversationStatus, addMessage]);

  // Polling effect
  useEffect(() => {
    if (!isOpen || !conversationId || conversationStatus === 'resolved') return;

    const interval = setInterval(pollForMessages, 2000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, conversationStatus, pollForMessages]);

  // Auto-scroll effect
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    // Add user message immediately
    addMessage(textToSend, 'user');
    setMessage('');

    if (conversationStatus === 'ai') {
      // AI response
      try {
        const response = await fetch('/api/openai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: textToSend, chatHistory: chatHistory }),
        });
        const data = await response.json();
        addMessage(data.response, 'bot');
      } catch (error) {
        console.error('Error getting AI response:', error);
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }
    } else if (conversationStatus === 'human' && conversationId) {
      // Send to agent via Slack
      try {
        await fetch('/api/send-to-slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, message: textToSend }),
        });
      } catch (error) {
        console.error('Error sending message to agent:', error);
        addMessage('Sorry, there was an error sending your message. Please try again.', 'bot');
      }
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
    addMessage("I'd like to talk to a human.", 'user');
    addMessage("I'd be happy to connect you with our team! To get started, please provide your email address:", 'bot');
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
          source: 'Chat',
          message: 'Customer requested human support via chat widget',
          pageUrl: window.location.href
        }),
      });
    } catch (error) {
      console.error('Error saving prospect:', error);
    }
    
    setHumanHandoffStep('question');
    addMessage(collectedEmail, 'user');
    addMessage("Thanks! Now, how can we help you today? Please describe what you need assistance with:", 'bot');
  };

  const handleQuestionSubmit = async () => {
    if (!collectedQuestion.trim()) {
      return;
    }

    setHumanHandoffStep('connecting');
    addMessage(collectedQuestion, 'user');
    addMessage("Perfect! We're connecting you with our team now. Someone will be with you shortly...", 'bot');

    // Send to Slack with real customer data
    try {
      const response = await fetch('/api/slack-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: collectedEmail.split('@')[0],
          customerEmail: collectedEmail,
          initialMessage: collectedQuestion,
          chatHistory: chatHistory,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversationId);
        setConversationStatus('human');
        console.log('Successfully notified Slack, conversation ID:', data.conversationId);
      } else {
        throw new Error('Failed to notify Slack');
      }
    } catch (error) {
      console.error('Error notifying Slack:', error);
      addMessage("Sorry, there was an error connecting you to our team. Please try again or contact us directly.", 'bot');
      setHumanHandoffStep('question');
    }
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
              <p>
                {conversationStatus === 'human' && isConnectedToAgent && agentName
                  ? `Connected to ${agentName}`
                  : conversationStatus === 'human' && humanHandoffStep === 'connecting'
                  ? 'Connecting to agent...'
                  : 'Here to help with your digitization needs'
                }
              </p>
            </div>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-content">
                  {msg.text}
                  {msg.agentName && (
                    <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                      - {msg.agentName}
                    </div>
                  )}
                </div>
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
                  placeholder={
                    conversationStatus === 'resolved' 
                      ? 'This conversation has ended'
                      : isConnectedToAgent 
                      ? `Message ${agentName || 'agent'}...`
                      : 'Type your message...'
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={conversationStatus === 'resolved'}
                />
                <button 
                  className="send-button" 
                  onClick={() => handleSendMessage()}
                  disabled={conversationStatus === 'resolved'}
                  style={{ opacity: conversationStatus === 'resolved' ? 0.6 : 1 }}
                >
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
