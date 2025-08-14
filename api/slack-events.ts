import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySlackRequest } from '../src/utils/slackService';
import { getConversationRecordByThreadId, updateConversationRecord } from '../src/utils/airtableConversations';

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

  const body = JSON.parse(rawBody);

  // Handle URL verification challenge
  if (body.type === 'url_verification') {
    console.log('Responding to url_verification challenge.');
    return res.status(200).send(body.challenge);
  }

  // Handle event callbacks
  if (body.type === 'event_callback') {
    const { event } = body;
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Handle messages in threads (agent replies)
    if (event.type === 'message' && !event.bot_id && event.thread_ts && event.text) {
      console.log(`Processing agent message in thread: ${event.thread_ts}`);
      
      try {
        const conversationRecord = await getConversationRecordByThreadId(event.thread_ts);
        
        if (conversationRecord) {
          console.log(`Found conversation record: ${conversationRecord.id}`);
          
          // Get current chat history
          const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
          
          // Add agent message to history
          const agentMessage = {
            sender: 'agent',
            text: event.text,
            timestamp: new Date().toISOString(),
            agent_id: event.user,
            agent_name: conversationRecord.fields['Agent Name'] || 'Support Agent'
          };
          
          chatHistory.push(agentMessage);
          
          // Update conversation record with new message
          await updateConversationRecord(conversationRecord.id, {
            'Chat History': JSON.stringify(chatHistory),
            'Last Agent Message': event.text,
            'Last Updated': new Date().toISOString(),
          });
          
          console.log('Updated chat history in Airtable with agent message.');
          
          // Update conversation status to active if it wasn't already
          if (conversationRecord.fields['Status'] !== 'active') {
            await updateConversationRecord(conversationRecord.id, {
              'Status': 'active'
            });
          }
          
        } else {
          console.warn(`No conversation record found for thread_ts: ${event.thread_ts}`);
        }
        
      } catch (error) {
        console.error('Error processing agent message:', error);
      }
    }
    
    // Handle other message types if needed
    else if (event.type === 'message' && event.bot_id) {
      console.log('Ignoring bot message to prevent loops');
    }
    
    else if (event.type === 'message' && !event.thread_ts) {
      console.log('Ignoring non-thread message');
    }
  }

  res.status(200).send('OK');
}
