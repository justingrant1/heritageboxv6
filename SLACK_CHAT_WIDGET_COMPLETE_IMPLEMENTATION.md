# Slack Chat Widget - Complete Implementation Guide

## Overview
This implementation provides a complete bi-directional chat widget that integrates with Slack for human handoff. When customers click "Talk to Human", it creates rich Slack notifications and enables real-time communication between agents and customers.

## Architecture

### Frontend Components
- **SlackChatWidget.tsx**: Main chat interface with AI and human handoff capabilities
- **Conversation Store**: Client-side state management for chat sessions
- **Polling System**: Real-time message updates from agents

### Backend APIs
- **slack-notify.ts**: Creates rich Slack notifications when customers request human help
- **slack-interactions.ts**: Handles Slack button interactions (Take Customer, Mark Complete)
- **send-to-slack.ts**: Forwards customer messages to Slack threads
- **agent-reply.ts**: Processes agent replies back to customers
- **chat-poll.ts**: Provides real-time updates to chat widget
- **openai-chat.ts**: Handles AI conversations with OpenAI + Airtable integration

### Data Management
- **Airtable Conversations**: Stores all chat history and conversation metadata
- **Slack Service**: Handles all Slack API interactions
- **Real-time Sync**: Keeps chat widget and Slack in perfect sync

## Workflow

### 1. Customer Initiates Chat
- Customer opens chat widget
- Can chat with AI assistant first
- AI has access to Airtable data for intelligent responses

### 2. Human Handoff Request
- Customer clicks "Talk to Human" button
- System creates conversation record in Airtable
- Rich Slack notification sent to #vip-channel with:
  - Customer details (name, email)
  - Chat history with AI
  - Action buttons for agents

### 3. Agent Takes Customer
- Agent clicks "Take Customer" button in Slack
- Conversation gets assigned to that agent
- Customer receives notification that agent is now helping
- Thread created in Slack for ongoing conversation

### 4. Real-time Communication
- **Customer → Agent**: Messages sent via send-to-slack.ts to Slack thread
- **Agent → Customer**: Agent replies in Slack thread, delivered via agent-reply.ts
- **Live Updates**: Chat widget polls for new messages every 2 seconds
- **Full History**: All messages stored in Airtable with timestamps

### 5. Conversation Management
- Agents can mark conversations as complete
- Full chat history maintained for future reference
- Conversation analytics and reporting available

## Required Environment Variables

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C1234567890  # Your #vip-channel ID
SLACK_SIGNING_SECRET=your-signing-secret

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Airtable Configuration
AIRTABLE_API_KEY=your-airtable-key
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_CONVERSATIONS_TABLE_ID=your-conversations-table-id
```

## Slack App Setup

### 1. Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Heritagebox Support Bot"
4. Select your workspace

### 2. Bot Token Scopes
Add these OAuth scopes in "OAuth & Permissions":
```
chat:write
chat:write.public
channels:read
im:write
users:read
```

### 3. Interactive Components
Enable in "Interactivity & Shortcuts":
- Request URL: `https://yourdomain.com/api/slack-interactions`
- Enable "Interactivity"

### 4. Event Subscriptions
Enable in "Event Subscriptions":
- Request URL: `https://yourdomain.com/api/slack-events`
- Subscribe to bot events: `message.channels`

### 5. Install App
1. Go to "Install App"
2. Click "Install to Workspace"
3. Copy the "Bot User OAuth Token" (starts with xoxb-)

## Airtable Setup

### Conversations Table Structure
Create a table called "Conversations" with these fields:

```
- Conversation ID (Single line text) - Primary field
- Customer Name (Single line text)
- Customer Email (Email)
- Status (Single select): Open, Assigned, Completed
- Assigned Agent (Single line text)
- Chat History (Long text)
- Created At (Date)
- Last Agent Response (Date)
- Slack Thread ID (Single line text)
```

## Key Features

### Rich Slack Notifications
- Professional formatting with customer details
- Chat history preview
- Urgency indicators
- One-click agent assignment

### Real-time Synchronization
- Instant message delivery both directions
- Live typing indicators
- Message status updates
- Connection status monitoring

### Conversation Management
- Full chat history preservation
- Agent assignment tracking
- Performance analytics
- Escalation workflows

### AI Integration
- OpenAI-powered responses
- Airtable data access for context
- Intelligent handoff decisions
- Conversation continuity

## Testing the Implementation

### 1. Test AI Chat
- Open chat widget on your website
- Send messages to test AI responses
- Verify AI has access to Airtable data
- Test conversation flow and context retention

### 2. Test Human Handoff
- Click "Talk to Human" button
- Check Slack #vip-channel for rich notification
- Verify customer details and chat history appear
- Test "Take Customer" button functionality

### 3. Test Bi-directional Communication
- Agent replies in Slack thread
- Verify customer receives agent messages in chat widget
- Test customer replies forwarding to Slack
- Check message timestamps and formatting

### 4. Test Conversation Management
- Mark conversations as complete
- Verify Airtable records update correctly
- Test conversation history preservation
- Check agent assignment tracking

## Deployment Checklist

### Environment Variables
- [ ] SLACK_BOT_TOKEN configured
- [ ] SLACK_CHANNEL_ID set to correct channel
- [ ] SLACK_SIGNING_SECRET added
- [ ] OPENAI_API_KEY configured
- [ ] AIRTABLE_API_KEY set
- [ ] AIRTABLE_BASE_ID configured
- [ ] AIRTABLE_CONVERSATIONS_TABLE_ID set

### Slack App Configuration
- [ ] Bot token scopes added
- [ ] Interactive components enabled
- [ ] Event subscriptions configured
- [ ] App installed to workspace
- [ ] Bot added to #vip-channel

### Airtable Setup
- [ ] Conversations table created
- [ ] All required fields added
- [ ] Proper field types configured
- [ ] API access verified

### Frontend Integration
- [ ] SlackChatWidget component added to website
- [ ] Chat widget appears in bottom right
- [ ] Styling matches brand guidelines
- [ ] Mobile responsiveness verified

## Troubleshooting

### Common Issues

**Slack notifications not appearing:**
- Check SLACK_BOT_TOKEN is valid
- Verify bot is added to #vip-channel
- Confirm SLACK_CHANNEL_ID is correct
- Check Slack app permissions

**Agent replies not reaching customers:**
- Verify agent-reply.ts endpoint is working
- Check Airtable conversation records
- Confirm polling is active in chat widget
- Test API endpoint directly

**AI responses not working:**
- Check OPENAI_API_KEY is valid
- Verify Airtable connection
- Test openai-chat.ts endpoint
- Check API rate limits

**Interactive buttons not working:**
- Confirm SLACK_SIGNING_SECRET is correct
- Verify slack-interactions.ts endpoint
- Check Slack app interactive components setup
- Test webhook URL accessibility

### Debug Tools

**Test Slack Integration:**
```bash
curl -X POST https://yourdomain.com/api/slack-notify \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "initialMessage": "I need help with my order",
    "chatHistory": []
  }'
```

**Test Agent Reply:**
```bash
curl -X POST https://yourdomain.com/api/agent-reply \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_123456789",
    "message": "Hello! How can I help you today?",
    "agentName": "Support Agent"
  }'
```

**Test Chat Polling:**
```bash
curl "https://yourdomain.com/api/chat-poll?conversationId=conv_123456789"
```

## Security Considerations

### API Security
- All endpoints validate request methods
- Slack webhook signatures verified
- Environment variables properly secured
- No sensitive data in client-side code

### Data Privacy
- Customer data encrypted in transit
- Airtable access properly scoped
- Chat history securely stored
- GDPR compliance considerations

### Rate Limiting
- Slack API rate limits respected
- OpenAI API usage monitored
- Polling frequency optimized
- Error handling implemented

## Performance Optimization

### Frontend Performance
- Chat widget lazy loaded
- Polling optimized for battery life
- Message history efficiently managed
- Mobile performance optimized

### Backend Performance
- API endpoints optimized for speed
- Airtable queries minimized
- Slack API calls batched when possible
- Error recovery implemented

### Monitoring
- API response times tracked
- Error rates monitored
- Slack integration health checked
- Customer satisfaction metrics

## Future Enhancements

### Advanced Features
- File upload support
- Screen sharing integration
- Video call handoff
- Multi-language support

### Analytics
- Conversation analytics dashboard
- Agent performance metrics
- Customer satisfaction surveys
- Response time tracking

### Integrations
- CRM system integration
- Ticketing system sync
- Knowledge base search
- Automated escalation rules

## Support

For technical support or questions about this implementation:

1. Check the troubleshooting section above
2. Review Slack API documentation
3. Test individual API endpoints
4. Verify environment variable configuration
5. Check Airtable table structure and permissions

This implementation provides a complete, production-ready chat widget with Slack integration that will significantly improve your customer support capabilities.
