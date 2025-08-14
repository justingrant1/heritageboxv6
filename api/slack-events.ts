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

  if (body.type === 'url_verification') {
    console.log('Responding to url_verification challenge.');
    return res.status(200).send(body.challenge);
  }

  if (body.type === 'event_callback') {
    const { event } = body;
    
    // COMPLETELY DISABLE message processing to prevent marking as read
    // Only acknowledge the event but don't process it
    console.log('Event received but not processed to preserve iOS notifications');
  }

  res.status(200).send('');
}
