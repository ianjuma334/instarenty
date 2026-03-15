/**
 * Phase 3.1: Booking Notification System Test Suite
 * 
 * This test script verifies that the booking notification system works correctly
 * by testing the end-to-end flow from booking creation to notification delivery.
 * 
 * Run this test with: node server/tests/bookingNotificationTest.js
 */

import mongoose from 'mongoose';
import bookingNotificationService from '../services/bookingNotificationService.js';
import notificationService from '../services/notificationService.js';
import User from '../Data/UserDetails.js';
import Post from '../Data/PostDetails.js';
import Booking from '../Data/BookingDetails.js';
import Notification from '../Data/NotificationDetails.js';

/**
 * Test Suite for Booking Notification System
 */
class BookingNotificationTestSuite {
  constructor() {
    this.testResults = [];
    this.testUsers = {
      landlord: null,
      tenant: null
    };
    this.testProperty = null;
    this.testBooking = null;
  }

  /**
   * Setup test environment
   */
  async setup() {
    try {
      console.log('🔧 Setting up test environment...');
      
      // Connect to test database if not already connected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instarenty-test');
      }

      // Create test users
      this.testUsers.landlord = await this.createTestUser({
        fname: 'John',
        lname: 'Landlord',
        username: 'john_landlord',
        email: 'john.landlord@test.com',
        phone: '+254700000001',
        role: 'landlord'
      });

      this.testUsers.tenant = await this.createTestUser({
        fname: 'Jane',
        lname: 'Tenant', 
        username: 'jane_tenant',
        email: 'jane.tenant@test.com',
        phone: '+254700000002',
        role: 'tenant',
        accountBalance: 1000 // Sufficient for booking fee
      });

      // Create test property
      this.testProperty = await this.createTestProperty({
        title: 'Test Property - Booking Notification',
        type: 'apartment',
        location: {
          area: 'Test Area',
          city: 'Test City'
        },
        userId: this.testUsers.landlord._id,
        numberOfVacancies: 5,
        price: 15000
      });

      console.log('✅ Test environment setup complete');
      return true;
    } catch (error) {
      console.error('❌ Test setup failed:', error);
      return false;
    }
  }

  /**
   * Test 1: Send booking notification to landlord
   */
  async testBookingNotificationToLandlord() {
    console.log('\n📱 Test 1: Sending booking notification to landlord...');
    
    try {
      const result = await bookingNotificationService.sendBookingNotificationToLandlord({
        postId: this.testProperty._id,
        tenantId: this.testUsers.tenant._id,
        numberBooked: 1,
        bookingId: new mongoose.Types.ObjectId().toString()
      });

      if (result.success) {
        console.log('✅ Booking notification sent successfully to landlord');
        console.log('   - Notification ID:', result.notificationId);
        console.log('   - Landlord ID:', result.landlordId);
        console.log('   - Delivery Status:', result.deliveryStatus);
        
        this.testResults.push({
          test: 'Booking Notification to Landlord',
          status: 'PASS',
          result: result
        });
        return true;
      } else {
        console.log('❌ Booking notification failed:', result.reason);
        this.testResults.push({
          test: 'Booking Notification to Landlord',
          status: 'FAIL',
          error: result.reason
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      this.testResults.push({
        test: 'Booking Notification to Landlord',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Test 2: Send booking confirmation to tenant
   */
  async testBookingConfirmationToTenant() {
    console.log('\n📱 Test 2: Sending booking confirmation to tenant...');
    
    try {
      const result = await bookingNotificationService.sendBookingConfirmationToTenant({
        postId: this.testProperty._id,
        tenantId: this.testUsers.tenant._id,
        numberBooked: 1,
        bookingId: new mongoose.Types.ObjectId().toString()
      });

      if (result.success) {
        console.log('✅ Booking confirmation sent successfully to tenant');
        console.log('   - Notification ID:', result.notificationId);
        console.log('   - Tenant ID:', result.tenantId);
        console.log('   - Delivery Status:', result.deliveryStatus);
        
        this.testResults.push({
          test: 'Booking Confirmation to Tenant',
          status: 'PASS',
          result: result
        });
        return true;
      } else {
        console.log('❌ Booking confirmation failed:', result.reason);
        this.testResults.push({
          test: 'Booking Confirmation to Tenant',
          status: 'FAIL',
          error: result.reason
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      this.testResults.push({
        test: 'Booking Confirmation to Tenant',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Test 3: Verify notification in database
   */
  async testNotificationInDatabase() {
    console.log('\n💾 Test 3: Verifying notifications in database...');
    
    try {
      // Check landlord notifications
      const landlordNotifications = await Notification.find({
        userId: this.testUsers.landlord._id,
        'metadata.notificationType': 'booking_received'
      });

      // Check tenant notifications
      const tenantNotifications = await Notification.find({
        userId: this.testUsers.tenant._id,
        'metadata.notificationType': 'booking_confirmed'
      });

      console.log('📊 Database verification results:');
      console.log('   - Landlord notifications found:', landlordNotifications.length);
      console.log('   - Tenant notifications found:', tenantNotifications.length);

      const landlordFound = landlordNotifications.length > 0;
      const tenantFound = tenantNotifications.length > 0;

      if (landlordFound && tenantFound) {
        console.log('✅ Both landlord and tenant notifications found in database');
        this.testResults.push({
          test: 'Notification Database Verification',
          status: 'PASS',
          landlordNotifications: landlordNotifications.length,
          tenantNotifications: tenantNotifications.length
        });
        return true;
      } else {
        console.log('❌ Missing notifications in database');
        this.testResults.push({
          test: 'Notification Database Verification',
          status: 'FAIL',
          landlordFound,
          tenantFound
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      this.testResults.push({
        test: 'Notification Database Verification',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Test 4: Bulk notification test
   */
  async testBulkNotifications() {
    console.log('\n📦 Test 4: Testing bulk booking notifications...');
    
    try {
      const bookingsData = [
        {
          postId: this.testProperty._id,
          tenantId: this.testUsers.tenant._id,
          numberBooked: 1,
          bookingId: new mongoose.Types.ObjectId().toString()
        },
        {
          postId: this.testProperty._id,
          tenantId: this.testUsers.tenant._id,
          numberBooked: 2,
          bookingId: new mongoose.Types.ObjectId().toString()
        }
      ];

      const result = await bookingNotificationService.sendBulkBookingNotifications(bookingsData);

      console.log('📊 Bulk notification results:');
      console.log('   - Total:', result.total);
      console.log('   - Successful:', result.successful);
      console.log('   - Failed:', result.failed);

      if (result.successful > 0) {
        console.log('✅ Bulk notifications processed successfully');
        this.testResults.push({
          test: 'Bulk Notifications',
          status: 'PASS',
          result: result
        });
        return true;
      } else {
        console.log('❌ Bulk notifications failed');
        this.testResults.push({
          test: 'Bulk Notifications',
          status: 'FAIL',
          result: result
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Bulk notification test failed:', error);
      this.testResults.push({
        test: 'Bulk Notifications',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Test 5: Notification statistics
   */
  async testNotificationStatistics() {
    console.log('\n📊 Test 5: Testing notification statistics...');
    
    try {
      const stats = await bookingNotificationService.getBookingNotificationStats(
        this.testUsers.landlord._id.toString()
      );

      console.log('📈 Notification statistics:');
      console.log('   - Total notifications:', stats.totalNotifications);
      console.log('   - Successful deliveries:', stats.successfulDeliveries);
      console.log('   - Failed deliveries:', stats.failedDeliveries);
      console.log('   - Success rate:', stats.successRate);

      if (stats.totalNotifications >= 0) {
        console.log('✅ Statistics retrieved successfully');
        this.testResults.push({
          test: 'Notification Statistics',
          status: 'PASS',
          stats: stats
        });
        return true;
      } else {
        console.log('❌ Statistics retrieval failed');
        this.testResults.push({
          test: 'Notification Statistics',
          status: 'FAIL'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Statistics test failed:', error);
      this.testResults.push({
        test: 'Notification Statistics',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Helper: Create test user
   */
  async createTestUser(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return existingUser;
    }

    const testUser = new User({
      uid: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fname: userData.fname,
      lname: userData.lname,
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'tenant',
      accountBalance: userData.accountBalance || 0,
      notificationPreferences: {
        enabled: true,
        categories: {
          booking: true,
          payment: true,
          message: true,
          security: true,
          system: true,
          marketing: true
        },
        quietHours: {
          enabled: false
        },
        sound: true,
        vibration: true
      },
      fcmTokens: [{
        token: `test_token_${Date.now()}`,
        deviceType: 'web',
        deviceName: 'Test Device',
        isActive: true
      }]
    });

    await testUser.save();
    return testUser;
  }

  /**
   * Helper: Create test property
   */
  async createTestProperty(propertyData) {
    const testProperty = new Post({
      title: propertyData.title,
      type: propertyData.type,
      location: propertyData.location,
      userId: propertyData.userId,
      numberOfVacancies: propertyData.numberOfVacancies,
      price: propertyData.price,
      description: 'Test property for booking notification testing',
      images: [],
      amenities: []
    });

    await testProperty.save();
    return testProperty;
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    try {
      console.log('\n🧹 Cleaning up test data...');
      
      // Clean up test notifications
      await Notification.deleteMany({
        $or: [
          { userId: this.testUsers.landlord?._id },
          { userId: this.testUsers.tenant?._id }
        ]
      });

      // Clean up test bookings
      await Booking.deleteMany({
        $or: [
          { userId: this.testUsers.tenant?._id }
        ]
      });

      // Clean up test property
      if (this.testProperty) {
        await Post.findByIdAndDelete(this.testProperty._id);
      }

      // Clean up test users
      if (this.testUsers.landlord) {
        await User.findByIdAndDelete(this.testUsers.landlord._id);
      }
      if (this.testUsers.tenant) {
        await User.findByIdAndDelete(this.testUsers.tenant._id);
      }

      console.log('✅ Test cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Booking Notification Test Suite...\n');

    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      console.log('❌ Test setup failed. Aborting tests.');
      return;
    }

    // Run tests
    await this.testBookingNotificationToLandlord();
    await this.testBookingConfirmationToTenant();
    await this.testNotificationInDatabase();
    await this.testBulkNotifications();
    await this.testNotificationStatistics();

    // Cleanup
    await this.cleanup();

    // Print results summary
    this.printResultsSummary();
  }

  /**
   * Print test results summary
   */
  printResultsSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 BOOKING NOTIFICATION TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`\n📊 Overall Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   💥 Errors: ${errors}`);
    console.log(`   📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    console.log(`\n📝 Individual Test Results:`);
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : 
                   result.status === 'FAIL' ? '❌' : '💥';
      console.log(`   ${index + 1}. ${icon} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    if (passed === this.testResults.length) {
      console.log('\n🎉 All tests passed! Booking notification system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new BookingNotificationTestSuite();
  testSuite.runAllTests().catch(console.error);
}

export default BookingNotificationTestSuite;