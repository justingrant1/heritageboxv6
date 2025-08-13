import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { conversationId } = req.query;

  if (!conversationId) {
    return res.status(400).send('Missing conversationId');
  }

  try {
    const conversationRecord = await getConversationRecord(conversationId as string);

    if (conversationRecord) {
      const conversation = {
        id: conversationRecord.fields['Conversation ID'],
        customerName: conversationRecord.fields['Customer Name'],
        customerEmail: conversationRecord.fields['Customer Email'],
        status: conversationRecord.fields['Status'],
        agentId: conversationRecord.fields['Agent ID'],
        slackThreadId: conversationRecord.fields['Slack Thread ID'],
        chatHistory: JSON.parse(conversationRecord.fields['Chat History'] as string || '[]'),
      };
      res.status(200).json(conversation);
    } else {
      res.status(404).send('Conversation not found');
    }
  } catch (error) {
    console.error('Error in chat-poll handler:', error);
    res.status(500).send('Internal Server Error');
  }
}
