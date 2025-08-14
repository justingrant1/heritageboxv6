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
    await createConversationRecord(conversationId, customerName, customerEmail, chatHistory);
  } catch (error) {
    return res.status(500).send('Error creating conversation record');
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 New Customer Support Request',
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Customer:*\n${customerName}` },
        { type: 'mrkdwn', text: `*Email:*\n${customerEmail}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n>${initialMessage}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Take Customer',
          },
          style: 'primary',
          action_id: 'take_customer',
          value: conversationId,
        },
      ],
    },
  ];

  await sendSlackMessage(process.env.SLACK_CHANNEL_ID as string, 'New customer support request', blocks);

  res.status(200).json({ conversationId });
}
