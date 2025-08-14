import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getConversationRecord } from '../src/utils/airtableConversations';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { conversationId, lastMessageCount } = req.query;

  if (!conversationId) {
    return res.status(400).json({ error: 'Missing conversationId' });
  }

  try {
    const conversationRecord = await getConversationRecord(conversationId as string);

    if (conversationRecord) {
      const chatHistory = JSON.parse(conversationRecord.fields['Chat History'] as string || '[]');
      const status = conversationRecord.fields['Status'] as string;
      const agentName = conversationRecord.fields['Agent Name'] as string;
      const lastUpdated = conversationRecord.fields['Last Updated'] as string;
      
      // Get the count of messages the client already has
      const clientMessageCount = parseInt(lastMessageCount as string || '0');
      
      // Check if there are new messages
      const hasNewMessages = chatHistory.length > clientMessageCount;
      
      // Get only new messages (messages after the client's last known count)
      const newMessages = hasNewMessages ? chatHistory.slice(clientMessageCount) : [];
      
      console.log(`Polling conversation ${conversationId}: ${chatHistory.length} total messages, ${newMessages.length} new messages`);
      
      res.status(200).json({
        messages: chatHistory, // Full message history
        newMessages: newMessages, // Only new messages since last poll
        totalMessageCount: chatHistory.length,
        hasNewMessages: hasNewMessages,
        status: status,
        agentName: agentName,
        lastUpdated: lastUpdated,
        conversationActive: status === 'active',
        agentConnected: status === 'active' && agentName
      });
      
    } else {
      console.warn(`Conversation not found: ${conversationId}`);
      res.status(404).json({ 
        error: 'Conversation not found',
        conversationId: conversationId 
      });
    }
    
  } catch (error) {
    console.error('Error in chat-poll handler:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
}
