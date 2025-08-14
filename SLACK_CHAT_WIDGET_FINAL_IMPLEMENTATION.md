# Slack Chat Widget - Complete Implementation Guide

## Overview
This implementation provides a complete bi-directional chat system between customers on your website and your team in Slack. The system includes AI-powered initial responses, seamless handoff to human agents, and real-time messaging.

## Architecture

### Frontend Components
- **SlackChatWidget.tsx**: Main chat interface with AI and human chat modes
- **Chat Widget Styles**: Integrated into index.css with modern, responsive design

### Backend APIs
- **slack-notify.ts**: Creates Slack notifications when customers request human help
- **slack-interactions.ts**: Handles Slack button interactions (Take Customer, Mark Handled)
- **slack-events.ts**: Processes incoming Slack messages from agents
- **chat-poll.ts**: Polling endpoint for customers to receive agent messages
- **send-to-slack.ts**: Sends customer messages to Slack threads
- **openai-chat.ts**: AI-powered responses using OpenAI

### Database Integration
- **airtableConversations.ts**: Manages conversation records in Airtable
- **Conversations Table**: Stores chat history, agent assignments, and status

## Required Environment Variables

Add these to your `.env` file:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_CHANNEL_ID=C1234567890  # Your #vip-channel ID

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here

# Airtable Configuration
AIRTABLE_API_KEY=your-airtable-key
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_CONVERSATIONS_TABLE_ID=your-conversations-table-id
```

## Slack App Setup

### 1. Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Heritagebox Chat"
4. Select your workspace

### 2. Bot Token Scopes
Add these OAuth scopes in "OAuth & Permissions":
```
chat:write
channels:read
channels:history
im:write
users:read
```

### 3. Event Subscriptions
Enable Events and add your endpoint:
- **Request URL**: `https://yourdomain.com/api/slack-events`
- **Subscribe to bot events**:
  - `message.channels`
  - `message.im`

### 4. Interactive Components
Enable Interactive Components:
- **Request URL**: `https://yourdomain.com/api/slack-interactions`

### 5. Install App
Install the app to your workspace and copy the Bot User OAuth Token.

## Airtable Setup

### Conversations Table Structure
Create a table called "Conversations" with these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| Conversation ID | Single line text | Unique identifier |
| Customer Name | Single line text | Customer's name |
| Customer Email | Email | Customer's email |
| Initial Message | Long text | Customer's first question |
| Chat History | Long text | JSON array of all messages |
| Status | Single select | pending, active, resolved |
| Agent ID | Single line text | Slack user ID of assigned agent |
| Agent Name | Single line text | Display name of agent |
| Slack Thread ID | Single line text | Slack message timestamp |
| Created Time | Created time | Auto-generated |
| Last Updated | Last modified time | Auto-generated |
| Last Agent Message | Long text | Most recent agent response |

## How It Works

### Customer Journey
1. **AI Chat**: Customer starts with AI assistant
2. **Human Request**: Customer clicks "Talk to a Human"
3. **Email Collection**: System collects customer email
4. **Question Collection**: Customer describes their issue
5. **Slack Notification**: Rich message posted to #vip-channel
6. **Agent Assignment**: Agent clicks "Take Customer" button
7. **Real-time Chat**: Bi-directional messaging begins
8. **Resolution**: Agent marks conversation as handled

### Agent Experience
1. **Notification**: Rich Slack message with customer details
2. **Quick Actions**: "Take Customer" or "Mark as Handled" buttons
3. **Thread Chat**: Reply in thread to message customer directly
4. **Status Updates**: Automatic status tracking in Airtable

### Technical Flow
1. Customer message → Frontend widget
2. Widget → API endpoint
3. API → Airtable (storage)
4. API → Slack (notification/message)
5. Slack response → Webhook → API
6. API → Airtable (update)
7. Customer polls → API → Updated messages

## Key Features

### Rich Slack Messages
- Customer information display
- Chat history preview
- Urgency indicators
- Interactive buttons

### Real-time Communication
- 2-second polling for new messages
- Instant message delivery
- Status updates (connecting, connected, resolved)
- Agent name display

### Data Management
- Complete conversation history
- Agent assignment tracking
- Performance metrics ready
- Customer contact information

### Error Handling
- Slack verification for security
- Graceful fallbacks for API failures
- User-friendly error messages
- Comprehensive logging

## Deployment Checklist

### 1. Environment Setup
- [ ] All environment variables configured
- [ ] Slack app created and installed
- [ ] Airtable table structure created
- [ ] OpenAI API key active

### 2. Webhook Configuration
- [ ] Slack Events URL verified
- [ ] Interactive Components URL verified
- [ ] SSL certificate valid
- [ ] Webhook endpoints responding

### 3. Testing
- [ ] AI chat responses working
- [ ] Human handoff flow complete
- [ ] Slack notifications appearing
- [ ] Agent buttons functional
- [ ] Bi-directional messaging working
- [ ] Conversation resolution working

### 4. Production
- [ ] Error monitoring enabled
- [ ] Performance metrics tracking
- [ ] Team training completed
- [ ] Backup procedures documented

## Usage Instructions

### For Customers
1. Click the chat widget (💬) in bottom right
2. Ask questions to the AI assistant
3. Click "Talk to a Human" when needed
4. Provide email and describe your issue
5. Chat directly with assigned agent

### For Agents
1. Monitor #vip-channel for customer notifications
2. Click "Take Customer" to claim conversations
3. Reply in the thread to message customers
4. Click "Mark as Handled" when resolved

## Monitoring & Analytics

### Available Metrics
- Total conversations initiated
- AI vs human resolution rates
- Average response times
- Agent performance statistics
- Customer satisfaction indicators

### Logging
All interactions are logged with:
- Timestamp information
- User identification
- Message content
- Error details
- Performance metrics

## Troubleshooting

### Common Issues
1. **Slack verification fails**: Check signing secret
2. **Messages not appearing**: Verify webhook URLs
3. **Polling not working**: Check conversation ID generation
4. **Agent buttons not responding**: Verify interactive components URL

### Debug Steps
1. Check Vercel function logs
2. Verify Slack app permissions
3. Test Airtable connectivity
4. Validate environment variables

## Security Considerations

### Data Protection
- Slack request verification implemented
- Customer data encrypted in transit
- Minimal data retention policy
- GDPR compliance ready

### Access Control
- Slack workspace restrictions
- Agent permission management
- API rate limiting
- Audit trail maintenance

## Future Enhancements

### Planned Features
- File upload support
- Video call integration
- Advanced analytics dashboard
- Multi-language support
- Mobile app integration

### Scalability
- Redis caching for high volume
- Database optimization
- CDN integration
- Load balancing support

---

## Support

For technical support or questions about this implementation, contact your development team or refer to the individual API documentation files.

**Last Updated**: August 2025
**Version**: 1.0.0
**Status**: Production Ready
