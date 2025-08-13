import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversation, addMessageToConversation } from '../src/utils/conversationStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { conversationId, message } = req.body;
  const conversation = getConversation(conversationId);

  if (!conversation || !conversation.slackThreadId) {
    return res.status(404).send('Conversation not found or not assigned to an agent');
  }

  addMessageToConversation(conversationId, 'user', message);

  await sendSlackThreadMessage(
    process.env.SLACK_CHANNEL_ID as string,
    conversation.slackThreadId,
    message
  );

  res.status(200).send('');
}
