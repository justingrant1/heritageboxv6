import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest } from '../src/utils/slackService';
import { getConversationRecordByThreadId, updateConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST' && req.body.challenge) {
    return res.status(200).send(req.body.challenge);
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { type, event } = req.body;

  if (type === 'event_callback') {
    if (event.type === 'message' && !event.bot_id && event.thread_ts) {
      const conversationRecord = await getConversationRecordByThreadId(event.thread_ts);
      if (conversationRecord) {
        const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
        chatHistory.push({ sender: 'agent', text: event.text });
        await updateConversationRecord(conversationRecord.id, {
          'Chat History': JSON.stringify(chatHistory),
        });
      }
    }
  }

  res.status(200).send('');
}
