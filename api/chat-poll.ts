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
      res.status(200).json({
        messages: JSON.parse(conversationRecord.fields['Chat History'] as string || '[]'),
        status: conversationRecord.fields['Status'],
      });
    } else {
      res.status(404).send('Conversation not found');
    }
  } catch (error) {
    console.error('Error in chat-poll handler:', error);
    res.status(500).send('Internal Server Error');
  }
}
