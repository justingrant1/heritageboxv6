import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { AirtableBase } from 'airtable/lib/airtable_base';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch product info from Airtable
async function getProductInfo(base: AirtableBase) {
  try {
    const records = await base('tblJ0hgzvDXWgQGmK').select({
      fields: ['Product Name', 'Description', 'Price'],
      maxRecords: 100,
    }).all();

    return records.map(record => ({
      name: record.get('Product Name'),
      description: record.get('Description'),
      price: record.get('Price'),
    }));
  } catch (error) {
    console.error('Error fetching product info from Airtable:', error);
    return [];
  }
}

// Helper function to fetch order status from Airtable
async function getOrderStatus(base: AirtableBase, orderIdentifier: string) {
  try {
    const isEmail = orderIdentifier.includes('@');
    let records;

    if (isEmail) {
      const customerRecords = await base('tblUS7uf11axEmL56')
        .select({
          filterByFormula: `LOWER({Email}) = LOWER("${orderIdentifier}")`,
          maxRecords: 1,
        })
        .firstPage();

      if (customerRecords.length === 0) {
        return 'No customer found with that email address.';
      }
      const customerId = customerRecords[0].id;

      records = await base('tblTq25QawVDHTTkV')
        .select({
          filterByFormula: `FIND("${customerId}", ARRAYJOIN({Customer}))`,
          fields: ['Order Number', 'Status', 'Order Date'],
          maxRecords: 5,
        })
        .all();
    } else {
      records = await base('tblTq25QawVDHTTkV')
        .select({
          filterByFormula: `LOWER({Order Number}) = LOWER("${orderIdentifier}")`,
          fields: ['Order Number', 'Status', 'Order Date'],
          maxRecords: 5,
        })
        .all();
    }

    if (records.length === 0) {
      return 'No order found with that information. Please double-check your order number or email.';
    }

    return records.map(record => 
      `Order #${record.get('Order Number')} (from ${record.get('Order Date')}): Status is ${record.get('Status')}`
    ).join('\n');
  } catch (error: any) {
    console.error('Detailed error fetching order status from Airtable:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      identifier: orderIdentifier,
    });
    return `ERROR: Could not retrieve order status.`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { message, chatHistory } = req.body;

  // Initialize Airtable base
  const Airtable = require('airtable');
  const base = new Airtable({ apiKey: process.env.VITE_AIRTABLE_API_KEY }).base(process.env.VITE_AIRTABLE_BASE_ID || 'appFMHAYZrTskpmdX');

  // Fetch product info from Airtable
  const productInfo = await getProductInfo(base);
  const productInfoString = productInfo.map(p => `${p.name}: ${p.description} (Price: $${p.price})`).join('\n');

  let orderStatusInfo = '';
  const orderKeywords = ['order', 'status', 'project'];
  const lastMessage = chatHistory && chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
  const assistantJustAskedForInfo =
    lastMessage &&
    lastMessage.sender === 'bot' &&
    (lastMessage.text.toLowerCase().includes('order number') || lastMessage.text.toLowerCase().includes('email'));

  if (orderKeywords.some(keyword => message.toLowerCase().includes(keyword)) || assistantJustAskedForInfo) {
    // Regex to find an email or a potential order number (6+ digits)
    const identifierMatch = message.match(/(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\b\d{6,}\b)/);
    if (identifierMatch) {
      console.log(`Found identifier: ${identifierMatch[0]}. Fetching order status...`);
      orderStatusInfo = await getOrderStatus(base, identifierMatch[0]);
      console.log(`Order status result: ${orderStatusInfo}`);
    }
  }

  const systemMessage = `
    You are a helpful assistant for Heritagebox. Your primary function is to provide information based *only* on the data provided to you in this prompt. Do not use any external knowledge or make assumptions.

    **Rule 1: Order Status Lookup**
    When a user asks for their order status, you must follow these steps precisely:
    1. Check the "Order Status Information" section below.
    2. If it contains order details (e.g., "Order #12345: Status is Shipped"), you MUST provide this information to the user.
    3. If it says "No order found", you MUST tell the user you couldn't find an order with that information and ask them to double-check it.
    4. If it starts with "ERROR:", you MUST tell the user you are having trouble looking up the order right now and to please try again in a moment.
    5. If it says "No order information has been looked up yet", you MUST ask the user for their order number or email address.
    You are forbidden from giving generic responses about not being able to access data. Your ability to access data is provided through the "Order Status Information" field.

    **Rule 2: Product Information**
    Use the "Product Information" section to answer questions about products and pricing.

    **Data for your response:**
    
    Product Information:
    ${productInfoString}

    Order Status Information:
    ${orderStatusInfo || 'No order information has been looked up yet.'}
  `;

  // Format chat history for OpenAI API
  const formattedHistory = (chatHistory || []).map((msg: { sender: string; text: string }) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemMessage },
        ...formattedHistory,
        { role: 'user', content: message },
      ],
    });

    res.status(200).json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).send('Error communicating with AI');
  }
}
