import requests
import sys
import json
from datetime import datetime

class NetflixAutomationAPITester:
    def __init__(self, base_url="https://netflix-mailbox.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    def test_get_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Get Dashboard Stats", "GET", "stats", 200)

    def test_get_config_empty(self):
        """Test get config when no config exists"""
        success, response = self.run_test("Get Config (Empty)", "GET", "config", 200)
        return success

    def test_create_config(self):
        """Test creating IMAP configuration"""
        config_data = {
            "email": "test@gmail.com",
            "password": "test_app_password",
            "imap_server": "imap.gmail.com",
            "imap_port": 993,
            "polling_interval": 60,
            "auto_click": True
        }
        return self.run_test("Create Config", "POST", "config", 200, config_data)

    def test_get_config_existing(self):
        """Test get config when config exists"""
        return self.run_test("Get Config (Existing)", "GET", "config", 200)

    def test_connection_test_fail(self):
        """Test IMAP connection (expected to fail with test credentials)"""
        # This should fail since we're using test credentials
        success, response = self.run_test("Test Connection", "POST", "config/test", 200)
        return True  # We expect this to work but connection to fail

    def test_get_emails(self):
        """Test get email logs"""
        return self.run_test("Get Email Logs", "GET", "emails", 200)

    def test_get_logs(self):
        """Test get activity logs"""
        return self.run_test("Get Activity Logs", "GET", "logs", 200)

    def test_monitoring_status(self):
        """Test monitoring status"""
        return self.run_test("Get Monitoring Status", "GET", "monitor/status", 200)

    def test_start_monitoring(self):
        """Test start monitoring"""
        return self.run_test("Start Monitoring", "POST", "monitor/start", 200)

    def test_stop_monitoring(self):
        """Test stop monitoring"""
        return self.run_test("Stop Monitoring", "POST", "monitor/stop", 200)

    def test_check_now(self):
        """Test manual email check"""
        return self.run_test("Check Now", "POST", "monitor/check-now", 200)

    def test_delete_config(self):
        """Test delete configuration"""
        return self.run_test("Delete Config", "DELETE", "config", 200)

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
    
    # Test sequence
    test_functions = [
        tester.test_root_endpoint,
        tester.test_get_stats,
        tester.test_get_config_empty,
        tester.test_create_config,
        tester.test_get_config_existing,
        tester.test_connection_test_fail,
        tester.test_get_emails,
        tester.test_get_logs,
        tester.test_monitoring_status,
        tester.test_start_monitoring,
        tester.test_stop_monitoring,
        tester.test_check_now,
        tester.test_clear_emails,
        tester.test_clear_logs,
        tester.test_delete_config,
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