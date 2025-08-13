const Airtable = require('airtable');

// Test the Airtable connection and data retrieval
async function testAirtableConnection() {
  try {
    console.log('Testing Airtable connection...');
    
    // Initialize Airtable base
    const base = new Airtable({ 
      apiKey: process.env.VITE_AIRTABLE_API_KEY 
    }).base(process.env.VITE_AIRTABLE_BASE_ID || 'appFMHAYZrTskpmdX');

    console.log('API Key exists:', !!process.env.VITE_AIRTABLE_API_KEY);
    console.log('Base ID:', process.env.VITE_AIRTABLE_BASE_ID || 'appFMHAYZrTskpmdX');

    // Test 1: Get customers
    console.log('\n--- Testing Customers Table ---');
    const customerRecords = await base('tblUS7uf11axEmL56')
      .select({
        filterByFormula: `LOWER({Email}) = LOWER("jgrant@trestacapital.com")`,
        maxRecords: 1,
      })
      .firstPage();

    console.log(`Found ${customerRecords.length} customer(s) for jgrant@trestacapital.com`);
    if (customerRecords.length > 0) {
      const customer = customerRecords[0];
      console.log('Customer ID:', customer.id);
      console.log('Customer Name:', customer.get('Name'));
      console.log('Customer Email:', customer.get('Email'));
      
      // Test 2: Get orders for this customer
      console.log('\n--- Testing Orders Table ---');
      const customerId = customer.id;
      
      const allOrders = await base('tblTq25QawVDHTTkV')
        .select({
          fields: ['Order Number', 'Status', 'Order Date', 'Customer'],
          maxRecords: 100,
        })
        .all();
      
      console.log(`Total orders in database: ${allOrders.length}`);
      
      // Filter orders for this customer
      const customerOrders = allOrders.filter(order => {
        const customerField = order.get('Customer');
        console.log(`Order ${order.get('Order Number')} Customer field:`, customerField);
        return Array.isArray(customerField) && customerField.includes(customerId);
      });
      
      console.log(`Orders for customer ${customerId}: ${customerOrders.length}`);
      customerOrders.forEach(order => {
        console.log(`- Order #${order.get('Order Number')} (${order.get('Order Date')}): ${order.get('Status')}`);
      });
    }

  } catch (error) {
    console.error('Error testing Airtable connection:', error);
  }
}

testAirtableConnection();
