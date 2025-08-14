import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSlackThreadMessage } from '../src/utils/slackService';
import { getConversationRecord, updateConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { conversationId, message, agentName } = req.body;
  
  if (!conversationId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const conversationRecord = await getConversationRecord(conversationId);

    if (!conversationRecord) {
      return res.status(404).send('Conversation not found');
    }

    // Update chat history with agent message
    const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
    chatHistory.push({ 
      sender: 'agent', 
      text: message,
      agentName: agentName || 'Support Agent',
      timestamp: new Date().toISOString()
    });

    await updateConversationRecord(conversationRecord.id, {
      'Chat History': JSON.stringify(chatHistory),
      'Last Agent Response': new Date().toISOString(),
    });

    res.status(200).json({ 
      success: true, 
      message: 'Agent reply sent to customer',
      conversationId 
    });

  } catch (error) {
    console.error('Error handling agent reply:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
