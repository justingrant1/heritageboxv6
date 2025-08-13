import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest } from '../src/utils/slackService';
import { getConversation, addMessageToConversation } from '../src/utils/conversationStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifySlackRequest(req)) {
    return res.status(401).send('Unauthorized');
  }

  const { type, challenge, event } = req.body;

  if (type === 'url_verification') {
    return res.status(200).send(challenge);
  }

  if (type === 'event_callback') {
    if (event.type === 'message' && !event.bot_id) {
      const conversation = getConversation(event.thread_ts);
      if (conversation) {
        addMessageToConversation(conversation.id, 'agent', event.text);
      }
    }
  }

  res.status(200).send('');
}
