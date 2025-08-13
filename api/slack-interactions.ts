import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest, sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversation, updateConversation } from '../src/utils/conversationStore';
import querystring from 'querystring';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const parsedBody = querystring.parse(req.body);
    const payload = JSON.parse(parsedBody.payload as string);

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
  } catch (error) {
    console.error('Error in slack-interactions handler:', error);
    res.status(500).send('Internal Server Error');
  }
}
