import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversationRecordByThreadId, updateConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { threadId, message, agentName } = req.body;

  if (!threadId || !message) {
    return res.status(400).json({ error: 'Missing threadId or message' });
  }

  try {
    // Send message to Slack thread
    await sendSlackThreadMessage(
      process.env.SLACK_CHANNEL_ID as string,
      threadId,
      message
    );

    // Update conversation record in Airtable
    const conversationRecord = await getConversationRecordByThreadId(threadId);
    
    if (conversationRecord) {
      const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
      chatHistory.push({ 
        sender: 'agent', 
        text: message,
        agentName: agentName || 'Agent',
        timestamp: new Date().toISOString()
      });
      
      await updateConversationRecord(conversationRecord.id, {
        'Chat History': JSON.stringify(chatHistory),
        'Status': 'Active - Agent Responding'
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending agent reply:', error);
    res.status(500).json({ error: 'Failed to send agent reply' });
  }
}
