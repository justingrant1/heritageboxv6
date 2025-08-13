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
    // Check if the identifier is an email or an order number
    const isEmail = orderIdentifier.includes('@');
    const filterByFormula = isEmail
      ? `LOWER({Customer Email}) = LOWER("${orderIdentifier}")`
      : `LOWER({Order Number}) = LOWER("${orderIdentifier}")`;

    const records = await base('tblTq25QawVDHTTkV').select({
      filterByFormula,
      fields: ['Order Number', 'Status', 'Order Date'],
      maxRecords: 5,
    }).all();

    if (records.length === 0) {
      return 'No order found with that information. Please double-check your order number or email.';
    }

    return records.map(record => 
      `Order #${record.get('Order Number')} (from ${record.get('Order Date')}): Status is ${record.get('Status')}`
    ).join('\n');
  } catch (error) {
    console.error('Error fetching order status from Airtable:', error);
    return 'There was an error fetching the order status.';
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
  if (orderKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    // Simple regex to find an order number or email in the message
    const identifierMatch = message.match(/(\b\w+@\w+\.\w+\b)|(\b\d{6,}\b)/);
    if (identifierMatch) {
      orderStatusInfo = await getOrderStatus(base, identifierMatch[0]);
    }
  }

  const systemMessage = `
    You are a helpful assistant for Heritagebox, a media digitization company.
    Your goal is to answer customer questions, provide pricing, and help them with their orders.
    Use the following product information to answer questions:
    ${productInfoString}

    If the user asks about their order status, use the following information:
    ${orderStatusInfo}
    If you need more information to check an order status, ask the user for their order number or email address.
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
