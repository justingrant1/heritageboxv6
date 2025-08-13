import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { AirtableBase } from 'airtable/lib/airtable_base';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch product info from Airtable
async function getProductInfo(base: AirtableBase) {
  try {
    const records = await base('Products').select({
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { message, chatHistory } = req.body;

  // Initialize Airtable base
  const Airtable = require('airtable');
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  // Fetch product info from Airtable
  const productInfo = await getProductInfo(base);
  const productInfoString = productInfo.map(p => `${p.name}: ${p.description} (Price: $${p.price})`).join('\n');

  const systemMessage = `
    You are a helpful assistant for Heritagebox, a media digitization company.
    Your goal is to answer customer questions, provide pricing, and help them with their orders.
    Use the following product information to answer questions:
    ${productInfoString}
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemMessage },
        ...chatHistory,
        { role: 'user', content: message },
      ],
    });

    res.status(200).json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).send('Error communicating with AI');
  }
}
