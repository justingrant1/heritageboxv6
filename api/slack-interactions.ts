import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest, sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversation, updateConversation } from '../src/utils/conversationStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifySlackRequest(req)) {
    return res.status(401).send('Unauthorized');
  }

  const payload = JSON.parse(req.body.payload);

  if (payload.type === 'block_actions') {
    const action = payload.actions[0];
    const conversationId = action.value;
    const conversation = getConversation(conversationId);

    if (action.action_id === 'take_customer' && conversation) {
      const agentId = payload.user.id;
      updateConversation(conversationId, { status: 'active', agentId });

      const thread_ts = payload.message.ts;
      updateConversation(conversationId, { slackThreadId: thread_ts });

      await sendSlackThreadMessage(
        payload.channel.id,
        thread_ts,
        `<@${agentId}> has taken the customer.`
      );
    }
  }

  res.status(200).send('');
}
