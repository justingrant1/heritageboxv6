import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversation, updateConversation } from '../src/utils/conversationStore';
import querystring from 'querystring';

// Disable Vercel's default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read the raw body from the request
const getRawBody = async (req: VercelRequest): Promise<string> => {
  const chunks: any[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await getRawBody(req);
    const parsedBody = querystring.parse(rawBody);
    
    if (!parsedBody.payload) {
      console.error('Payload is missing from the request body.');
      return res.status(400).send('Bad Request: Missing payload.');
    }

    const payload = JSON.parse(parsedBody.payload as string);
    console.log('Received payload:', JSON.stringify(payload, null, 2));

    if (payload.type === 'block_actions') {
      console.log('Processing block_actions...');
      const action = payload.actions[0];
      const conversationId = action.value;
      console.log(`Action ID: ${action.action_id}, Conversation ID: ${conversationId}`);

      const conversation = getConversation(conversationId);
      console.log('Retrieved conversation from store:', conversation);

      if (action.action_id === 'take_customer' && conversation) {
        console.log('"take_customer" action confirmed for a valid conversation.');
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
