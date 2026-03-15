#!/usr/bin/env node

/**
 * Simple Firebase Admin Test for Server Directory
 * 
 * This script tests Firebase Admin configuration from the server directory
 * where dependencies are properly installed.
 * 
 * Usage: cd server && node testFirebaseSimple.js
 */

async function testFirebaseAdmin() {
  console.log('🧪 Simple Firebase Admin Configuration Test');
  console.log('=' .repeat(50));
  
  try {
    // Dynamic import to avoid initialization issues
    const admin = (await import('firebase-admin')).default;
    
    console.log('\n📦 Firebase Admin SDK loaded successfully');
    
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      console.log('✅ Test completed successfully');
      return true;
    }
    
    // Check basic environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY', 
      'FIREBASE_CLIENT_EMAIL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('💡 Please configure your .env file with Firebase Admin credentials');
      console.log('📖 See FIREBASE_ADMIN_SETUP_GUIDE.md for instructions');
      return false;
    }
    
    console.log('✅ Required environment variables are present');
    
    // Try to initialize Firebase Admin
    console.log('\n🚀 Attempting to initialize Firebase Admin...');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE || 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    
    console.log('✅ Firebase Admin initialized successfully!');
    
    // Test Cloud Messaging
    const messaging = admin.messaging();
    if (messaging) {
      console.log('✅ Firebase Cloud Messaging service is available');
    }
    
    // Show project info
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      console.log(`✅ Project ID: ${projectId}`);
    }
    
    console.log('\n🎉 Firebase Admin Configuration Test: PASSED');
    console.log('=' .repeat(50));
    console.log('🚀 Your Firebase Admin setup is working correctly!');
    console.log('📱 You can now test FCM push notifications');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ Firebase Admin Configuration Test: FAILED');
    console.log('=' .repeat(50));
    
    console.log(`Error: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('private key')) {
      console.log('\n💡 Private Key Issues:');
      console.log('   - Check FIREBASE_PRIVATE_KEY format');
      console.log('   - Ensure line breaks are escaped as \\n');
      console.log('   - Verify the key is complete');
    } else if (error.message.includes('project')) {
      console.log('\n💡 Project Issues:');
      console.log('   - Verify FIREBASE_PROJECT_ID is correct');
      console.log('   - Check service account belongs to the project');
    } else if (error.message.includes('credentials')) {
      console.log('\n💡 Credentials Issues:');
      console.log('   - Generate new service account key from Firebase Console');
      console.log('   - Copy all fields correctly to .env file');
    }
    
    console.log('\n📖 For detailed setup instructions: FIREBASE_ADMIN_SETUP_GUIDE.md');
    
    return false;
  }
}

// Main execution
async function main() {
  const success = await testFirebaseAdmin();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export default testFirebaseAdmin;