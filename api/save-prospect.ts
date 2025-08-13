// Vercel serverless function types
interface VercelRequest {
    method?: string;
    body: any;
    query: { [key: string]: string | string[] };
    headers: { [key: string]: string };
}

interface VercelResponse {
    status: (code: number) => VercelResponse;
    json: (object: any) => VercelResponse;
    send: (body: any) => VercelResponse;
    end: () => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, source, message, phone, pageUrl } = req.body;

    console.log('🎯 PROSPECT API - Received data:', { email, name, source, message, phone, pageUrl });

    // Validate required fields
    if (!email || !source) {
      console.error('❌ PROSPECT API - Missing required fields:', { email, source });
      return res.status(400).json({ error: 'Email and source are required' });
    }

    // Prepare the prospect data for Airtable
    const prospectData = {
      Email: email,
      Name: name || '',
      Source: source,
      Status: 'New',
      Notes: message || `${source} submission from ${pageUrl || 'website'}`,
      Phone: phone || ''
    };

    console.log('📝 PROSPECT API - Formatted data for Airtable:', prospectData);

    // Save to Airtable using fetch - using correct HBOX2 base ID and table ID
    const AIRTABLE_BASE_ID = 'appFMHAYZrTskpmdX'; // HBOX2 base ID (same as create-order.ts)
    const PROSPECTS_TABLE_ID = 'tblogFLfRkbopp0fK'; // Prospects table ID
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PROSPECTS_TABLE_ID}`;
    
    const airtableResponse = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: prospectData
      })
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ PROSPECT API - Airtable error:', {
        status: airtableResponse.status,
        statusText: airtableResponse.statusText,
        error: errorText
      });
      throw new Error(`Airtable API error: ${airtableResponse.status} - ${errorText}`);
    }

    const airtableResult = await airtableResponse.json();
    console.log('✅ PROSPECT API - Successfully saved to Airtable:', airtableResult.id);

    return res.status(200).json({ 
      success: true, 
      prospectId: airtableResult.id,
      message: 'Prospect saved successfully'
    });

  } catch (error) {
    console.error('❌ PROSPECT API - Error saving prospect:', error);
    
    return res.status(500).json({ 
      error: 'Failed to save prospect',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
