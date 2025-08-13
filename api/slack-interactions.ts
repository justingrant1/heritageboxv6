import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversation, updateConversation } from '../src/utils/conversationStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));

    if (!req.body || !req.body.payload) {
      console.error('Payload is missing from the request body.');
      return res.status(400).send('Bad Request: Missing payload.');
    }

    const payload = JSON.parse(req.body.payload);
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

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
