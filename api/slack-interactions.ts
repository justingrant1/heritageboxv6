import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest, sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversationRecord, updateConversationRecord } from '../src/utils/airtableConversations';
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

  const rawBody = await getRawBody(req);

  if (!verifySlackRequest(req.headers, rawBody)) {
    console.error('Slack request verification failed.');
    return res.status(401).send('Unauthorized');
  }

  try {
    const parsedBody = querystring.parse(rawBody);
    
    if (!parsedBody.payload) {
      console.error('Payload is missing from the request body.');
      return res.status(400).send('Bad Request: Missing payload.');
    }

    const payload = JSON.parse(parsedBody.payload as string);
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const conversationId = action.value;
      const agentId = payload.user.id;
      const agentName = payload.user.name;
      const channelId = payload.channel.id;
      const messageTs = payload.message.ts;

      console.log(`Processing action: ${action.action_id} for conversation: ${conversationId}`);

      const conversationRecord = await getConversationRecord(conversationId);
      
      if (!conversationRecord) {
        console.error(`No conversation record found for ID: ${conversationId}`);
        return res.status(404).send('Conversation not found');
      }

      if (action.action_id === 'take_customer') {
        // Update conversation record with agent info and thread ID
        await updateConversationRecord(conversationRecord.id, {
          'Status': 'active',
          'Agent ID': agentId,
          'Agent Name': agentName,
          'Slack Thread ID': messageTs,
        });

        // Send confirmation message in thread
        await sendSlackThreadMessage(
          channelId,
          messageTs,
          `🎯 <@${agentId}> has taken this customer and is now handling their request.\n\n` +
          `**Next Steps:**\n` +
          `• Reply in this thread to send messages directly to the customer\n` +
          `• Customer will see your messages in real-time\n` +
          `• All conversation history is automatically saved\n\n` +
          `*Customer is waiting for your response...*`
        );

        console.log(`Agent ${agentName} took customer ${conversationId}`);

      } else if (action.action_id === 'mark_handled') {
        // Mark conversation as resolved
        await updateConversationRecord(conversationRecord.id, {
          'Status': 'resolved',
          'Agent ID': agentId,
          'Agent Name': agentName,
        });

        // Send confirmation message in thread
        await sendSlackThreadMessage(
          channelId,
          messageTs,
          `✅ <@${agentId}> has marked this customer request as handled and resolved.`
        );

        console.log(`Agent ${agentName} marked conversation ${conversationId} as handled`);
      }

      // Send immediate response to Slack to acknowledge the interaction
      res.status(200).json({
        response_type: 'ephemeral',
        text: action.action_id === 'take_customer' 
          ? '✅ You have taken this customer. Reply in the thread to chat with them!'
          : '✅ Customer request marked as handled.'
      });

    } else {
      console.log('Unhandled payload type:', payload.type);
      res.status(200).send('OK');
    }

  } catch (error) {
    console.error('Error in slack-interactions handler:', error);
    res.status(500).send('Internal Server Error');
  }
}
