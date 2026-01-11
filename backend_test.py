import requests
import sys
import json
from datetime import datetime

class NetflixAutomationAPITester:
    def __init__(self, base_url="https://netflix-mailbox.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_account_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": None
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response_data"] = response.json()
                except:
                    result["response_data"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    result["error"] = error_data
                except:
                    result["error"] = response.text

            self.test_results.append(result)
            return success, result.get("response_data", {})

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_admin_login_valid(self):
        """Test admin login with valid credentials"""
        login_data = {
            "username": "AdminZuma",
            "password": "Zuma2925!"
        }
        success, response = self.run_test("Admin Login (Valid)", "POST", "auth/login", 200, login_data)
        if success and response.get('success') and response.get('token'):
            self.token = response['token']
            print(f"   ✅ Token received: {self.token[:20]}...")
        return success

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        login_data = {
            "username": "WrongUser",
            "password": "WrongPass"
        }
        success, response = self.run_test("Admin Login (Invalid)", "POST", "auth/login", 200, login_data)
        # Should return 200 but success=false
        if success and not response.get('success'):
            print(f"   ✅ Correctly rejected invalid credentials")
            return True
        return False

    def test_token_verify(self):
        """Test token verification"""
        if not self.token:
            print("   ⚠️  Skipping - No token available")
            return False
        
        success, response = self.run_test("Token Verify", "POST", f"auth/verify?token={self.token}", 200)
        if success and response.get('valid'):
            print(f"   ✅ Token is valid for user: {response.get('username')}")
        return success

    def test_get_accounts_empty(self):
        """Test get accounts when no accounts exist"""
        return self.run_test("Get Accounts (Empty)", "GET", "accounts", 200)

    def test_create_account(self):
        """Test creating a new email account"""
        account_data = {
            "name": "Test Gmail Account",
            "email": "test@gmail.com",
            "password": "test_app_password_1234",
            "imap_server": "imap.gmail.com",
            "imap_port": 993,
            "is_active": True
        }
        success, response = self.run_test("Create Account", "POST", "accounts", 200, account_data)
        if success and response.get('id'):
            self.created_account_id = response['id']
            print(f"   ✅ Account created with ID: {self.created_account_id}")
        return success

    def test_get_accounts_with_data(self):
        """Test get accounts when accounts exist"""
        success, response = self.run_test("Get Accounts (With Data)", "GET", "accounts", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   ✅ Found {len(response)} accounts")
            # Check if passwords are masked
            for account in response:
                if account.get('password') == '********':
                    print(f"   ✅ Password properly masked for {account.get('name')}")
        return success

    def test_get_single_account(self):
        """Test get single account by ID"""
        if not self.created_account_id:
            print("   ⚠️  Skipping - No account ID available")
            return False
        
        return self.run_test("Get Single Account", "GET", f"accounts/{self.created_account_id}", 200)

    def test_account_connection_test(self):
        """Test IMAP connection for account (expected to fail with test credentials)"""
        if not self.created_account_id:
            print("   ⚠️  Skipping - No account ID available")
            return False
        
        success, response = self.run_test("Test Account Connection", "POST", f"accounts/{self.created_account_id}/test", 200)
        # We expect this to return 200 but with success=false due to invalid credentials
        if success and not response.get('success'):
            print(f"   ✅ Connection test correctly failed: {response.get('message')}")
            return True
        return success

    def test_get_monitoring_config(self):
        """Test get monitoring configuration"""
        return self.run_test("Get Monitoring Config", "GET", "config/monitoring", 200)

    def test_update_monitoring_config(self):
        """Test update monitoring configuration"""
        config_data = {
            "polling_interval": 120,
            "auto_click": False
        }
        return self.run_test("Update Monitoring Config", "POST", "config/monitoring", 200, config_data)

    def test_get_emails(self):
        """Test get email logs"""
        return self.run_test("Get Email Logs", "GET", "emails", 200)

    def test_get_emails_filtered(self):
        """Test get email logs with filter"""
        return self.run_test("Get Email Logs (Filtered)", "GET", "emails?email_type=household_update", 200)

    def test_get_logs(self):
        """Test get activity logs"""
        return self.run_test("Get Activity Logs", "GET", "logs", 200)

    def test_get_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Get Dashboard Stats", "GET", "stats", 200)

    def test_monitoring_status(self):
        """Test monitoring status"""
        return self.run_test("Get Monitoring Status", "GET", "monitor/status", 200)

    def test_start_monitoring_no_accounts(self):
        """Test start monitoring without accounts (should fail)"""
        # First delete the test account if it exists
        if self.created_account_id:
            self.run_test("Delete Test Account", "DELETE", f"accounts/{self.created_account_id}", 200)
        
        success, response = self.run_test("Start Monitoring (No Accounts)", "POST", "monitor/start", 400)
        return success

    def test_recreate_account_for_monitoring(self):
        """Recreate account for monitoring tests"""
        account_data = {
            "name": "Test Gmail Account 2",
            "email": "test2@gmail.com", 
            "password": "test_app_password_5678",
            "imap_server": "imap.gmail.com",
            "imap_port": 993,
            "is_active": True
        }
        success, response = self.run_test("Recreate Account", "POST", "accounts", 200, account_data)
        if success and response.get('id'):
            self.created_account_id = response['id']
        return success

    def test_start_monitoring(self):
        """Test start monitoring with accounts"""
        return self.run_test("Start Monitoring", "POST", "monitor/start", 200)

    def test_stop_monitoring(self):
        """Test stop monitoring"""
        return self.run_test("Stop Monitoring", "POST", "monitor/stop", 200)

    def test_check_now(self):
        """Test manual email check"""
        return self.run_test("Check Now", "POST", "monitor/check-now", 200)

    def test_logout(self):
        """Test admin logout"""
        if not self.token:
            print("   ⚠️  Skipping - No token available")
            return False
        
        return self.run_test("Admin Logout", "POST", f"auth/logout?token={self.token}", 200)

    def test_cleanup_account(self):
        """Clean up test account"""
        if not self.created_account_id:
            print("   ⚠️  Skipping - No account to clean up")
            return True
        
        return self.run_test("Delete Test Account", "DELETE", f"accounts/{self.created_account_id}", 200)

    def test_clear_emails(self):
        """Test clear email logs"""
        return self.run_test("Clear Email Logs", "DELETE", "emails", 200)

    def test_clear_logs(self):
        """Test clear activity logs"""
        return self.run_test("Clear Activity Logs", "DELETE", "logs", 200)

def main():
    print("🚀 Starting Netflix Household Automation API Tests")
    print("=" * 60)
    
    tester = NetflixAutomationAPITester()
    
    # Test sequence - organized by functionality
    test_functions = [
        # Basic API
        tester.test_root_endpoint,
        
        # Authentication tests
        tester.test_admin_login_valid,
        tester.test_admin_login_invalid,
        tester.test_token_verify,
        
        # Account management tests
        tester.test_get_accounts_empty,
        tester.test_create_account,
        tester.test_get_accounts_with_data,
        tester.test_get_single_account,
        tester.test_account_connection_test,
        
        # Configuration tests
        tester.test_get_monitoring_config,
        tester.test_update_monitoring_config,
        
        # Email and logging tests
        tester.test_get_emails,
        tester.test_get_emails_filtered,
        tester.test_get_logs,
        tester.test_get_stats,
        
        # Monitoring tests
        tester.test_monitoring_status,
        tester.test_start_monitoring_no_accounts,
        tester.test_recreate_account_for_monitoring,
        tester.test_start_monitoring,
        tester.test_stop_monitoring,
        tester.test_check_now,
        
        # Cleanup tests
        tester.test_logout,
        tester.test_cleanup_account,
        tester.test_clear_emails,
        tester.test_clear_logs,
    ]
    
    # Run all tests
    for test_func in test_functions:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results Summary")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Print failed tests
    failed_tests = [r for r in tester.test_results if not r["success"]]
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test['test']}: {test.get('error', 'Status mismatch')}")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": tester.tests_passed/tester.tests_run*100 if tester.tests_run > 0 else 0
            },
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())