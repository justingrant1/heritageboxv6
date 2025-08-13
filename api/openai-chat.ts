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
      console.log(`Looking up customer by email: ${orderIdentifier}`);
      const customerRecords = await base('tblUS7uf11axEmL56') // Customers table
        .select({
          filterByFormula: `LOWER({Email}) = LOWER("${orderIdentifier}")`,
          maxRecords: 1,
        })
        .firstPage();

      if (customerRecords.length === 0) {
        console.log(`No customer found for email: ${orderIdentifier}`);
        return 'No order found with that information. Please double-check your order number or email.';
      }
      const customerId = customerRecords[0].id;
      console.log(`Found customer ID: ${customerId}`);

      console.log(`Looking up orders for customer ID: ${customerId}`);
      // Get all orders and filter programmatically since Airtable formulas are tricky with linked records
      const allOrders = await base('tblTq25QawVDHTTkV') // Orders table
        .select({
          fields: ['Order Number', 'Status', 'Order Date', 'Customer'],
          maxRecords: 100,
        })
        .all();
      
      // Filter orders that have this customer ID in their Customer array
      records = allOrders.filter(order => {
        const customerField = order.get('Customer');
        return Array.isArray(customerField) && customerField.includes(customerId);
      });
    } else {
      console.log(`Looking up order by number: ${orderIdentifier}`);
      records = await base('tblTq25QawVDHTTkV') // Orders table
        .select({
          filterByFormula: `LOWER({Order Number}) = LOWER("${orderIdentifier}")`,
          fields: ['Order Number', 'Status', 'Order Date'],
          maxRecords: 5,
        })
        .all();
    }

    if (records.length === 0) {
      console.log(`No orders found for identifier: ${orderIdentifier}`);
      return 'No order found with that information. Please double-check your order number or email.';
    }

    console.log(`Found ${records.length} order(s).`);
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

  console.log(`Message: "${message}"`);
  console.log(`Contains order keywords: ${orderKeywords.some(keyword => message.toLowerCase().includes(keyword))}`);
  console.log(`Assistant just asked for info: ${assistantJustAskedForInfo}`);

  if (orderKeywords.some(keyword => message.toLowerCase().includes(keyword)) || assistantJustAskedForInfo) {
    // Regex to find an email or a potential order number (6+ digits)
    const identifierMatch = message.match(/(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\b\d{6,}\b)/);
    console.log(`Identifier match: ${identifierMatch ? identifierMatch[0] : 'none'}`);
    if (identifierMatch) {
      console.log(`Found identifier: ${identifierMatch[0]}. Fetching order status...`);
      orderStatusInfo = await getOrderStatus(base, identifierMatch[0]);
      console.log(`Order status result: ${orderStatusInfo}`);
    }
  }

  const systemMessage = `
    You are a helpful customer service assistant for Heritagebox, a professional media digitization service. You should be friendly, helpful, and speak naturally like a human customer service representative.

    **Order Status Information:**
    ${orderStatusInfo || 'No order information has been looked up yet.'}

    **How to handle order lookups:**
    - If the Order Status Information shows actual order details, present them naturally to the customer
    - If multiple orders are found, list them all clearly
    - If no orders are found, politely ask them to double-check their information
    - If no lookup has been done yet, ask for their order number or email address
    - Always be conversational and helpful, not robotic

    **Product Information (for other questions):**
    ${productInfoString}

    **Guidelines:**
    - Be conversational and friendly
    - Don't mention "data provided" or "system information" 
    - Respond as if you're a knowledgeable customer service representative
    - If you find order information, present it clearly and ask if they need anything else
  `;

  console.log('System message being sent to OpenAI:');
  console.log('Order Status Info:', orderStatusInfo);
  console.log('Full system message length:', systemMessage.length);

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
