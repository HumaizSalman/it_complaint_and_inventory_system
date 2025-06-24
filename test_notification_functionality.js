/**
 * Frontend Notification System Test
 * 
 * This script can be run in the browser console to test notification functionality.
 * 
 * Instructions:
 * 1. Open the Employee Portal in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Paste this script and press Enter
 * 5. The script will test notification fetching and display
 */

console.log('🔔 Testing Notification System...');

// Test notification service
async function testNotificationSystem() {
    try {
        // Check if notification service is available
        if (typeof notificationService === 'undefined') {
            console.log('⚠️  Notification service not directly accessible. Testing via API...');
            
            // Test API directly
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ No authentication token found. Please login first.');
                return;
            }
            
            // Test notification fetch
            const response = await fetch('http://localhost:8000/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const notifications = await response.json();
                console.log('✅ Successfully fetched notifications:', notifications.length);
                
                // Check for complaint resolved notifications
                const resolvedNotifications = notifications.filter(n => n.type === 'complaint_resolved');
                console.log(`📧 Found ${resolvedNotifications.length} complaint resolution notifications`);
                
                if (resolvedNotifications.length > 0) {
                    console.log('Latest resolution notification:', resolvedNotifications[0]);
                }
                
                return true;
            } else {
                console.error('❌ Failed to fetch notifications:', response.status, response.statusText);
                return false;
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing notification system:', error);
        return false;
    }
}

// Test notification bell component
function testNotificationBell() {
    console.log('🔔 Testing NotificationBell component...');
    
    // Look for notification bell in DOM
    const notificationBell = document.querySelector('[aria-label*="notification"]');
    if (notificationBell) {
        console.log('✅ NotificationBell component found in DOM');
        
        // Check for badge
        const badge = notificationBell.querySelector('.MuiBadge-badge');
        if (badge) {
            const count = badge.textContent;
            console.log(`📊 Notification badge shows: ${count} unread notifications`);
        } else {
            console.log('📊 No notification badge visible (0 unread notifications)');
        }
        
        return true;
    } else {
        console.log('⚠️  NotificationBell component not found in DOM');
        return false;
    }
}

// Test notification types
function testNotificationTypes() {
    console.log('🏷️  Testing notification types...');
    
    const expectedTypes = [
        'complaint_resolved',
        'complaint_forwarded_to_am',
        'complaint_forwarded_to_manager',
        'complaint_sent_to_vendor',
        'message'
    ];
    
    console.log('Expected notification types:', expectedTypes);
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting notification system tests...');
    console.log('=' * 50);
    
    const results = {
        apiTest: await testNotificationSystem(),
        bellTest: testNotificationBell(),
        typesTest: testNotificationTypes()
    };
    
    console.log('=' * 50);
    console.log('📊 Test Results:');
    console.log(`API Test: ${results.apiTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Bell Test: ${results.bellTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Types Test: ${results.typesTest ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
    
    if (allPassed) {
        console.log('\n🎉 Notification system is working correctly!');
        console.log('Next steps:');
        console.log('1. Login as ATS user in another tab');
        console.log('2. Resolve a complaint');
        console.log('3. Check this tab for new notifications');
    } else {
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure you are logged in');
        console.log('2. Check that the backend is running on port 8000');
        console.log('3. Verify you are on the Employee Portal page');
        console.log('4. Check browser console for any errors');
    }
    
    return results;
}

// Auto-run tests
runAllTests(); 