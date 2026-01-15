import { getDb, closeDb } from './client.js';
import { customers } from './schema/customers.js';
import { users, userRoles } from './schema/users.js';
import { accounts } from './schema/accounts.js';
import { contacts } from './schema/contacts.js';
import { opportunities } from './schema/opportunities.js';
import { 
  generateCustomerId, 
  generateUserId, 
  generateAccountId, 
  generateContactId, 
  generateOpportunityId,
  generateId 
} from '../utils/id.js';
import argon2 from 'argon2';

async function seed() {
  console.log('🌱 Seeding database...');

  const db = getDb();

  try {
    // Create demo customer (tenant)
    // Use a fixed ID so that JWT tokens remain valid after reseeding
    const customerId = 'cus_NFBfyIcDP2mFL4cF-EzSX'; // Fixed demo customer ID
    await db.insert(customers).values({
      id: customerId,
      name: 'Demo Company',
      slug: 'demo',
      domain: 'demo.salesos.dev',
      plan: 'pro',
      status: 'active',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        defaultCurrency: 'USD',
        emailDailyLimit: 500,
      },
    });
    console.log(`✅ Created customer: ${customerId}`);

    // Create demo users
    // Use fixed IDs so that JWT tokens remain valid after reseeding
    const adminId = 'usr_DHLy4CZtYcas6YTFmfkaT'; // Fixed admin user ID
    const repId = 'usr_salesrep123456789'; // Fixed sales rep ID
    
    const passwordHash = await argon2.hash('demo123!');

    await db.insert(users).values([
      {
        id: adminId,
        customerId,
        email: 'admin@demo.salesos.dev',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        emailVerified: true,
      },
      {
        id: repId,
        customerId,
        email: 'rep@demo.salesos.dev',
        passwordHash,
        firstName: 'Sales',
        lastName: 'Rep',
        status: 'active',
        emailVerified: true,
      },
    ]);
    console.log(`✅ Created users: ${adminId}, ${repId}`);

    // Assign roles
    await db.insert(userRoles).values([
      { id: generateId(), userId: adminId, role: 'admin' },
      { id: generateId(), userId: repId, role: 'sales_rep' },
    ]);
    console.log('✅ Assigned roles');

    // Create demo accounts
    const account1Id = generateAccountId();
    const account2Id = generateAccountId();

    await db.insert(accounts).values([
      {
        id: account1Id,
        customerId,
        name: 'Acme Corporation',
        domain: 'acme.com',
        website: 'https://acme.com',
        industry: 'Technology',
        employeeCount: 500,
        annualRevenue: 50000000, // $50M in cents
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        ownerId: repId,
        status: 'active',
      },
      {
        id: account2Id,
        customerId,
        name: 'Globex Inc',
        domain: 'globex.com',
        website: 'https://globex.com',
        industry: 'Manufacturing',
        employeeCount: 1000,
        annualRevenue: 100000000,
        city: 'New York',
        state: 'NY',
        country: 'USA',
        ownerId: repId,
        status: 'prospect',
      },
    ]);
    console.log(`✅ Created accounts: ${account1Id}, ${account2Id}`);

    // Create demo contacts
    const contact1Id = generateContactId();
    const contact2Id = generateContactId();
    const contact3Id = generateContactId();

    await db.insert(contacts).values([
      {
        id: contact1Id,
        customerId,
        accountId: account1Id,
        email: 'john.doe@acme.com',
        firstName: 'John',
        lastName: 'Doe',
        title: 'VP of Engineering',
        department: 'Engineering',
        phone: '+1-555-0101',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        timezone: 'America/Los_Angeles',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        ownerId: repId,
        status: 'active',
        source: 'linkedin',
      },
      {
        id: contact2Id,
        customerId,
        accountId: account1Id,
        email: 'jane.smith@acme.com',
        firstName: 'Jane',
        lastName: 'Smith',
        title: 'CTO',
        department: 'Technology',
        phone: '+1-555-0102',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        timezone: 'America/Los_Angeles',
        ownerId: repId,
        status: 'active',
        source: 'referral',
      },
      {
        id: contact3Id,
        customerId,
        accountId: account2Id,
        email: 'bob.wilson@globex.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        title: 'Director of Operations',
        department: 'Operations',
        phone: '+1-555-0201',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        timezone: 'America/New_York',
        ownerId: repId,
        status: 'active',
        source: 'website',
      },
    ]);
    console.log(`✅ Created contacts: ${contact1Id}, ${contact2Id}, ${contact3Id}`);

    // Create demo opportunities
    const opp1Id = generateOpportunityId();
    const opp2Id = generateOpportunityId();

    await db.insert(opportunities).values([
      {
        id: opp1Id,
        customerId,
        accountId: account1Id,
        primaryContactId: contact2Id,
        name: 'Acme Enterprise License',
        description: 'Enterprise license deal for Acme Corp',
        stage: 'proposal',
        probability: 60,
        amount: 12000000, // $120,000
        currency: 'USD',
        closeDate: '2026-02-28',
        ownerId: repId,
        source: 'outbound',
      },
      {
        id: opp2Id,
        customerId,
        accountId: account2Id,
        primaryContactId: contact3Id,
        name: 'Globex Pilot Program',
        description: 'Initial pilot with Globex',
        stage: 'qualification',
        probability: 30,
        amount: 5000000, // $50,000
        currency: 'USD',
        closeDate: '2026-03-31',
        ownerId: repId,
        source: 'website',
      },
    ]);
    console.log(`✅ Created opportunities: ${opp1Id}, ${opp2Id}`);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\nDemo credentials:');
    console.log('  Admin: admin@demo.salesos.dev / demo123!');
    console.log('  Sales Rep: rep@demo.salesos.dev / demo123!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await closeDb();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

