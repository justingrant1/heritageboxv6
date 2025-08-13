import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConversation } from '../src/utils/conversationStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { conversationId } = req.query;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).send('Missing conversationId');
  }

  const conversation = getConversation(conversationId);

  if (!conversation) {
    return res.status(404).send('Conversation not found');
  }

  res.status(200).json({
    messages: conversation.chatHistory,
    status: conversation.status,
    agentName: conversation.agentId ? 'Agent' : null,
  });
}
