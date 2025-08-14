import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversationRecord, updateConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { conversationId, message } = req.body;
  const conversationRecord = await getConversationRecord(conversationId);

  if (!conversationRecord || !conversationRecord.fields['Slack Thread ID']) {
    return res.status(404).send('Conversation not found or not assigned to an agent');
  }

  const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
  chatHistory.push({ sender: 'user', text: message });

  await updateConversationRecord(conversationRecord.id, {
    'Chat History': JSON.stringify(chatHistory),
  });

  await sendSlackThreadMessage(
    process.env.SLACK_CHANNEL_ID as string,
    conversationRecord.fields['Slack Thread ID'] as string,
    message
  );

  res.status(200).send('');
}
