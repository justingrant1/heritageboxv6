import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackMessage } from '../src/utils/slackService';
import { createConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { customerName, customerEmail, initialMessage, chatHistory } = req.body;
  const conversationId = `conv_${Date.now()}`;

  try {
    // Create conversation record first
    await createConversationRecord(conversationId, customerName, customerEmail, chatHistory);
    
    // Create rich Slack message with proper formatting
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 URGENT: New Customer Support Request'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Customer:*\n${customerName}`
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n${customerEmail}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Initial Message:*\n> ${initialMessage}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Conversation ID:* \`${conversationId}\``
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✋ Take This Customer'
            },
            style: 'primary',
            action_id: 'take_customer',
            value: conversationId
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Mark as Handled'
            },
            style: 'danger',
            action_id: 'mark_handled',
            value: conversationId
          }
        ]
      }
    ];

    // Send to specific channel with @channel mention for notifications
    const channelId = process.env.SLACK_CHANNEL_ID || '#vip-channel';
    const result = await sendSlackMessage(
      channelId,
      `<!channel> 🚨 URGENT: Customer ${customerName} needs immediate assistance!`,
      blocks
    );

    console.log('Slack message sent successfully:', result.ts);

    res.status(200).json({ 
      conversationId,
      slackMessageId: result.ts,
      success: true 
    });

  } catch (error) {
    console.error('Error in slack-notify handler:', error);
    res.status(500).json({ 
      error: 'Failed to send Slack notification',
      details: error.message 
    });
  }
}
