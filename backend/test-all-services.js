// Comprehensive service testing script
// Run with: node test-all-services.js

const SERVICES = [
  { name: 'API Gateway', port: 3000, path: '/health' },
  { name: 'Auth Service', port: 3001, path: '/health' },
  { name: 'CRM Service', port: 3002, path: '/health' },
  { name: 'Email Service', port: 3003, path: '/health' },
  { name: 'Calendar Service', port: 3004, path: '/health' },
  { name: 'Sequences Service', port: 3005, path: '/health' },
  { name: 'Activities Service', port: 3006, path: '/health' },
];

const GATEWAY_URL = 'http://localhost:3000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testHealthChecks() {
  logSection('1. Testing Health Checks');
  
  for (const service of SERVICES) {
    const url = `http://localhost:${service.port}${service.path}`;
    const result = await testEndpoint(url);
    
    if (result.success) {
      log(`✓ ${service.name} (Port ${service.port}): ${JSON.stringify(result.data)}`, 'green');
    } else {
      log(`✗ ${service.name} (Port ${service.port}): ${result.error || 'Failed'}`, 'red');
    }
  }
}

async function testAuthFlow() {
  logSection('2. Testing Authentication Flow');
  
  // Test login
  log('\n→ Testing Login...', 'blue');
  const loginResult = await testEndpoint(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@demo.salesos.dev',
      password: 'demo123!',
    }),
  });
  
  if (loginResult.success) {
    log(`✓ Login successful`, 'green');
    
    // Log the actual response structure for debugging
    console.log('Login response:', JSON.stringify(loginResult.data, null, 2));
    
    // Handle different response structures
    const user = loginResult.data.user || loginResult.data.data?.user;
    const tokens = loginResult.data.tokens || loginResult.data.data?.tokens || loginResult.data;
    const accessToken = tokens?.accessToken || tokens?.access_token || loginResult.data?.accessToken;
    
    if (user) {
      log(`  User: ${user.email}`, 'green');
      log(`  Roles: ${user.roles?.join(', ') || 'N/A'}`, 'green');
    }
    log(`  Access Token: ${accessToken ? 'Present' : 'Missing'}`, 'green');
    log(`  Refresh Token: ${tokens?.refreshToken || tokens?.refresh_token ? 'Present' : 'Missing'}`, 'green');
    
    if (!accessToken) {
      log(`⚠ Warning: No access token in response`, 'yellow');
      return null;
    }
    
    return accessToken;
  } else {
    log(`✗ Login failed: ${loginResult.error || JSON.stringify(loginResult.data)}`, 'red');
    return null;
  }
}

async function testCRMEndpoints(accessToken) {
  logSection('3. Testing CRM Endpoints (via Gateway)');
  
  if (!accessToken) {
    log('⚠ Skipping CRM tests - no access token', 'yellow');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  // Test Accounts
  log('\n→ Testing GET /api/v1/accounts...', 'blue');
  const accountsResult = await testEndpoint(`${GATEWAY_URL}/api/v1/accounts`, { headers });
  if (accountsResult.success) {
    log(`✓ Accounts retrieved: ${accountsResult.data.data?.length || 0} accounts`, 'green');
    if (accountsResult.data.data?.length > 0) {
      log(`  First account: ${accountsResult.data.data[0].name}`, 'green');
    }
  } else {
    log(`✗ Accounts fetch failed: ${accountsResult.error || JSON.stringify(accountsResult.data)}`, 'red');
  }
  
  // Test Contacts
  log('\n→ Testing GET /api/v1/contacts...', 'blue');
  const contactsResult = await testEndpoint(`${GATEWAY_URL}/api/v1/contacts`, { headers });
  if (contactsResult.success) {
    log(`✓ Contacts retrieved: ${contactsResult.data.data?.length || 0} contacts`, 'green');
    if (contactsResult.data.data?.length > 0) {
      log(`  First contact: ${contactsResult.data.data[0].firstName} ${contactsResult.data.data[0].lastName}`, 'green');
    }
  } else {
    log(`✗ Contacts fetch failed: ${contactsResult.error || JSON.stringify(contactsResult.data)}`, 'red');
  }
  
  // Test Opportunities
  log('\n→ Testing GET /api/v1/opportunities...', 'blue');
  const opportunitiesResult = await testEndpoint(`${GATEWAY_URL}/api/v1/opportunities`, { headers });
  if (opportunitiesResult.success) {
    log(`✓ Opportunities retrieved: ${opportunitiesResult.data.data?.length || 0} opportunities`, 'green');
    if (opportunitiesResult.data.data?.length > 0) {
      log(`  First opportunity: ${opportunitiesResult.data.data[0].name} - $${opportunitiesResult.data.data[0].value}`, 'green');
    }
  } else {
    log(`✗ Opportunities fetch failed: ${opportunitiesResult.error || JSON.stringify(opportunitiesResult.data)}`, 'red');
  }
}

async function testEmailService(accessToken) {
  logSection('4. Testing Email Service');
  
  if (!accessToken) {
    log('⚠ Skipping Email tests - no access token', 'yellow');
    return;
  }
  
  // Test email tracking pixel (public route) - returns GIF image, not JSON
  log('\n→ Testing Email Tracking Pixel (Public)...', 'blue');
  try {
    const response = await fetch(`${GATEWAY_URL}/api/v1/emails/track/open/test-email-id-123`);
    if (response.ok && response.headers.get('content-type')?.includes('image')) {
      log(`✓ Email tracking pixel endpoint accessible (returns GIF image)`, 'green');
    } else {
      log(`⚠ Email tracking responded with status ${response.status}`, 'yellow');
    }
  } catch (error) {
    log(`✗ Email tracking failed: ${error.message}`, 'red');
  }
}

async function testCalendarService(accessToken) {
  logSection('5. Testing Calendar Service');
  
  if (!accessToken) {
    log('⚠ Skipping Calendar tests - no access token', 'yellow');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  log('\n→ Testing GET /api/v1/calendar/meetings...', 'blue');
  const meetingsResult = await testEndpoint(`${GATEWAY_URL}/api/v1/calendar/meetings`, { headers });
  if (meetingsResult.success) {
    log(`✓ Meetings retrieved: ${meetingsResult.data.data?.length || 0} meetings`, 'green');
  } else {
    log(`✗ Meetings fetch failed: ${meetingsResult.error || JSON.stringify(meetingsResult.data)}`, 'red');
  }
}

async function testSequencesService(accessToken) {
  logSection('6. Testing Sequences Service');
  
  if (!accessToken) {
    log('⚠ Skipping Sequences tests - no access token', 'yellow');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  log('\n→ Testing GET /api/v1/sequences...', 'blue');
  const sequencesResult = await testEndpoint(`${GATEWAY_URL}/api/v1/sequences`, { headers });
  if (sequencesResult.success) {
    log(`✓ Sequences retrieved: ${sequencesResult.data.data?.length || 0} sequences`, 'green');
  } else {
    log(`✗ Sequences fetch failed: ${sequencesResult.error || JSON.stringify(sequencesResult.data)}`, 'red');
  }
}

async function testActivitiesService(accessToken) {
  logSection('7. Testing Activities Service');
  
  if (!accessToken) {
    log('⚠ Skipping Activities tests - no access token', 'yellow');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  log('\n→ Testing GET /api/v1/activities...', 'blue');
  const activitiesResult = await testEndpoint(`${GATEWAY_URL}/api/v1/activities`, { headers });
  if (activitiesResult.success) {
    log(`✓ Activities retrieved: ${activitiesResult.data.data?.length || 0} activities`, 'green');
    if (activitiesResult.data.data?.length > 0) {
      log(`  First activity: ${activitiesResult.data.data[0].type} - ${activitiesResult.data.data[0].description}`, 'green');
    }
  } else {
    log(`✗ Activities fetch failed: ${activitiesResult.error || JSON.stringify(activitiesResult.data)}`, 'red');
  }
}

async function testGatewayFeatures(accessToken) {
  logSection('8. Testing Gateway Features');
  
  if (!accessToken) {
    log('⚠ Skipping Gateway feature tests - no access token', 'yellow');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  // Test rate limiting headers
  log('\n→ Testing Rate Limiting Headers...', 'blue');
  const rateLimitResult = await testEndpoint(`${GATEWAY_URL}/api/v1/accounts`, { headers });
  if (rateLimitResult.success && rateLimitResult.headers) {
    const rateLimitHeaders = {
      policy: rateLimitResult.headers['ratelimit-policy'],
      limit: rateLimitResult.headers['ratelimit-limit'],
      remaining: rateLimitResult.headers['ratelimit-remaining'],
      reset: rateLimitResult.headers['ratelimit-reset'],
    };
    
    if (rateLimitHeaders.limit) {
      log(`✓ Rate limiting active:`, 'green');
      log(`  Policy: ${rateLimitHeaders.policy}`, 'green');
      log(`  Limit: ${rateLimitHeaders.limit} requests`, 'green');
      log(`  Remaining: ${rateLimitHeaders.remaining} requests`, 'green');
      log(`  Reset in: ${rateLimitHeaders.reset} seconds`, 'green');
    } else {
      log(`⚠ Rate limiting headers not found`, 'yellow');
    }
  }
  
  // Test CORS headers
  log('\n→ Testing CORS Headers...', 'blue');
  if (rateLimitResult.headers) {
    const corsHeaders = {
      origin: rateLimitResult.headers['access-control-allow-origin'],
      credentials: rateLimitResult.headers['access-control-allow-credentials'],
    };
    
    if (corsHeaders.origin) {
      log(`✓ CORS configured:`, 'green');
      log(`  Allow Origin: ${corsHeaders.origin}`, 'green');
      log(`  Allow Credentials: ${corsHeaders.credentials}`, 'green');
    } else {
      log(`⚠ CORS headers not found`, 'yellow');
    }
  }
  
  // Test request ID propagation
  log('\n→ Testing Request ID Propagation...', 'blue');
  if (rateLimitResult.headers && rateLimitResult.headers['x-request-id']) {
    log(`✓ Request ID present: ${rateLimitResult.headers['x-request-id']}`, 'green');
  } else {
    log(`⚠ Request ID not found in response headers`, 'yellow');
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          SalesOS Microservices - Comprehensive Test Suite          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const startTime = Date.now();
  
  // Run all tests
  await testHealthChecks();
  const accessToken = await testAuthFlow();
  await testCRMEndpoints(accessToken);
  await testEmailService(accessToken);
  await testCalendarService(accessToken);
  await testSequencesService(accessToken);
  await testActivitiesService(accessToken);
  await testGatewayFeatures(accessToken);
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logSection('Test Summary');
  log(`\nAll tests completed in ${duration}s`, 'cyan');
  log('\nNext Steps:', 'yellow');
  log('  1. Review any failed tests above', 'yellow');
  log('  2. Check service logs for errors: npm run dev:all', 'yellow');
  log('  3. Verify Kafka workers are running properly', 'yellow');
  log('  4. Test the frontend: npm run dev (in frontend folder)', 'yellow');
  log('\nFor detailed logs, check the terminal running npm run dev:all\n', 'yellow');
}

// Run tests
runAllTests().catch((error) => {
  log(`\n✗ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

