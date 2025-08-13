import Airtable from 'airtable';

const airtableApiKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;
const tableName = 'Conversations';

if (!airtableApiKey || !airtableBaseId) {
  throw new Error('Airtable API key or Base ID is not set in environment variables.');
}

const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);
const table = base(tableName);

export const createConversationRecord = async (id: string, customerName: string, customerEmail: string) => {
  try {
    const records = await table.create([
      {
        fields: {
          'Conversation ID': id,
          'Customer Name': customerName,
          'Customer Email': customerEmail,
          'Status': 'waiting',
          'Chat History': JSON.stringify([{ sender: 'user', text: 'Initial request' }]),
        },
      },
    ]);
    return records[0];
  } catch (error) {
    console.error('Error creating conversation in Airtable:', error);
    throw error;
  }
};

export const getConversationRecord = async (id: string) => {
  try {
    const records = await table.select({
      filterByFormula: `{Conversation ID} = '${id}'`,
      maxRecords: 1,
    }).firstPage();
    return records[0];
  } catch (error) {
    console.error('Error getting conversation from Airtable:', error);
    throw error;
  }
};

export const updateConversationRecord = async (recordId: string, fields: object) => {
  try {
    const updatedRecord = await table.update(recordId, fields);
    return updatedRecord;
  } catch (error) {
    console.error('Error updating conversation in Airtable:', error);
    throw error;
  }
};

export const getConversationRecordByThreadId = async (threadId: string) => {
  try {
    const records = await table.select({
      filterByFormula: `{Slack Thread ID} = '${threadId}'`,
      maxRecords: 1,
    }).firstPage();
    return records[0];
  } catch (error) {
    console.error('Error getting conversation from Airtable by thread ID:', error);
    throw error;
  }
};
