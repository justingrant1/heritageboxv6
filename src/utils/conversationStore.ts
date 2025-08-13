interface Conversation {
  id: string;
  slackThreadId: string | null;
  customerName: string;
  customerEmail: string;
  chatHistory: { sender: 'user' | 'bot' | 'agent'; text: string }[];
  status: 'bot' | 'waiting' | 'active' | 'resolved';
  agentId: string | null;
}

const conversations = new Map<string, Conversation>();

export const createConversation = (id: string, customerName: string, customerEmail: string): Conversation => {
  const newConversation: Conversation = {
    id,
    slackThreadId: null,
    customerName,
    customerEmail,
    chatHistory: [],
    status: 'bot',
    agentId: null,
  };
  conversations.set(id, newConversation);
  return newConversation;
};

export const getConversation = (id: string): Conversation | undefined => {
  return conversations.get(id);
};

export const updateConversation = (id: string, updates: Partial<Conversation>): Conversation | undefined => {
  const conversation = conversations.get(id);
  if (conversation) {
    const updatedConversation = { ...conversation, ...updates };
    conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  return undefined;
};

export const addMessageToConversation = (id: string, sender: 'user' | 'bot' | 'agent', text: string) => {
  const conversation = getConversation(id);
  if (conversation) {
    conversation.chatHistory.push({ sender, text });
  }
};
