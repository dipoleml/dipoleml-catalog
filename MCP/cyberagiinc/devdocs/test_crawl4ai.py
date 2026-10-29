import requests
import time
import sys
import os
import socket
import json

# Get API token from environment or use default
API_TOKEN = os.environ.get("CRAWL4AI_API_TOKEN", "devdocs-demo-key")

# Determine if we're running inside a container
def is_running_in_container():
    try:
        with open('/proc/1/cgroup', 'r') as f:
            return 'docker' in f.read() or 'kubepods' in f.read()
    except:
        return False

# Set the appropriate host based on environment
CRAWL4AI_HOST = "crawl4ai" if is_running_in_container() else "localhost"
CRAWL4AI_URL = f"http://{CRAWL4AI_HOST}:11235"

print(f"Using Crawl4AI URL: {CRAWL4AI_URL}")

def test_health():
    """Test the health endpoint of the Crawl4AI service"""
    try:
        print("Testing health endpoint...")
        health = requests.get(f"{CRAWL4AI_URL}/health", timeout=5)
        print(f"Health check status code: {health.status_code}")
        print(f"Health check response: {health.json()}")
        return True
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        return False

def test_unsecured():
    """Test the Crawl4AI service without authentication"""
    try:
        print("\nTesting unsecured crawl...")
        response = requests.post(
            f"{CRAWL4AI_URL}/crawl",
            json={
                "urls": "https://www.nbcnews.com/business",
                "priority": 10
            },
            timeout=10
        )
        print(f"Crawl request status code: {response.status_code}")
        print(f"Crawl request response: {response.json()}")
        
        if response.status_code == 200:
            task_id = response.json()["task_id"]
            print(f"Task ID: {task_id}")
            
            # Poll for result
            print("\nPolling for task result...")
            for i in range(10):
                print(f"Poll attempt {i+1}/10")
                status_response = requests.get(
                    f"{CRAWL4AI_URL}/task/{task_id}",
                    timeout=5
                )
                status = status_response.json()
                print(f"Task status: {status['status']}")
                
                if status["status"] == "completed":
                    print("Task completed!")
                    # Save the result to a file
                    save_result_to_file(task_id, status["result"])
                    return True
                elif status["status"] == "failed":
                    print(f"Task failed: {status.get('error', 'Unknown error')}")
                    return False
                
                time.sleep(2)
            
            print("Task did not complete within timeout")
            return False
        else:
            print("Crawl request failed")
            return False
    except Exception as e:
        print(f"Unsecured test failed: {str(e)}")
        return False

def test_secured():
    """Test the Crawl4AI service with authentication"""
    try:
        print("\nTesting secured crawl with token:", API_TOKEN)
        headers = {"Authorization": f"Bearer {API_TOKEN}"}
        
        response = requests.post(
            f"{CRAWL4AI_URL}/crawl",
            headers=headers,
            json={
                "urls": "https://www.nbcnews.com/business",
                "priority": 10
            },
            timeout=10
        )
        print(f"Crawl request status code: {response.status_code}")
        print(f"Crawl request response: {response.json()}")
        
        if response.status_code == 200:
            task_id = response.json()["task_id"]
            print(f"Task ID: {task_id}")
            
            # Poll for result
            print("\nPolling for task result...")
            for i in range(10):
                print(f"Poll attempt {i+1}/10")
                status_response = requests.get(
                    f"{CRAWL4AI_URL}/task/{task_id}",
                    headers=headers,
                    timeout=5
                )
                status = status_response.json()
                print(f"Task status: {status['status']}")
                
                if status["status"] == "completed":
                    print("Task completed!")
                    # Save the result to a file
                    save_result_to_file(task_id, status["result"])
                    return True
                elif status["status"] == "failed":
                    print(f"Task failed: {status.get('error', 'Unknown error')}")
                    return False
                
                time.sleep(2)
            
            print("Task did not complete within timeout")
            return False
        else:
            print("Crawl request failed")
            return False
    except Exception as e:
        print(f"Secured test failed: {str(e)}")
        return False

def save_result_to_file(task_id, result):
    """Save the result to a file"""
    try:
        # Create a directory for results if it doesn't exist
        os.makedirs("crawl_results", exist_ok=True)
        
        # Save the full result to a JSON file
        result_file = f"crawl_results/{task_id}.json"
        with open(result_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Full result saved to {result_file}")
        
        # Extract and save the markdown content if available
        if "markdown" in result and result["markdown"]:
            markdown_file = f"crawl_results/{task_id}.md"
            with open(markdown_file, 'w') as f:
                f.write(result["markdown"])
            print(f"Markdown content saved to {markdown_file}")
            
            # Print a preview of the markdown content
            preview_length = min(500, len(result["markdown"]))
            print(f"\nMarkdown content preview (first {preview_length} characters):")
            print(result["markdown"][:preview_length] + "...")
        else:
            print("No markdown content available in the result")
            
        # Print information about the result
        if "title" in result:
            print(f"Page title: {result['title']}")
        if "links" in result:
            internal_links = result["links"].get("internal", [])
            external_links = result["links"].get("external", [])
            print(f"Found {len(internal_links)} internal links and {len(external_links)} external links")
            
        return True
    except Exception as e:
        print(f"Error saving result to file: {str(e)}")
        return False

def test_ping():
    """Test if we can ping the Crawl4AI container"""
    try:
        print(f"\nTesting ping to {CRAWL4AI_HOST}...")
        # Try to resolve the hostname
        try:
            ip = socket.gethostbyname(CRAWL4AI_HOST)
            print(f"Resolved {CRAWL4AI_HOST} to IP: {ip}")
        except socket.gaierror:
            print(f"Could not resolve hostname: {CRAWL4AI_HOST}")
            return False
            
        # Try to connect to the port
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        result = s.connect_ex((CRAWL4AI_HOST, 11235))
        s.close()
        
        if result == 0:
            print(f"Successfully connected to {CRAWL4AI_HOST}:11235")
            return True
        else:
            print(f"Could not connect to {CRAWL4AI_HOST}:11235, error code: {result}")
            return False
    except Exception as e:
        print(f"Ping test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Crawl4AI Test Script ===")
    print(f"API Token: {API_TOKEN}")
    print(f"Running in container: {is_running_in_container()}")
    print(f"Using Crawl4AI host: {CRAWL4AI_HOST}")
    
    # First test if we can ping the host
    ping_ok = test_ping()
    
    if ping_ok:
        print("\n=== Ping test passed, proceeding with API tests ===")
        # Run tests
        health_ok = test_health()
        
        if health_ok:
            print("\n=== Health check passed, proceeding with tests ===")
            unsecured_ok = test_unsecured()
            secured_ok = test_secured()
            
            print("\n=== Test Results ===")
            print(f"Ping test: {'PASS' if ping_ok else 'FAIL'}")
            print(f"Health check: {'PASS' if health_ok else 'FAIL'}")
            print(f"Unsecured test: {'PASS' if unsecured_ok else 'FAIL'}")
            print(f"Secured test: {'PASS' if secured_ok else 'FAIL'}")
            
            if secured_ok:
                print("\n=== Results ===")
                print("The crawl results have been saved to the 'crawl_results' directory.")
                print("You can view the results in the following ways:")
                print("1. Open the JSON file for the full result")
                print("2. Open the Markdown file for the formatted content")
                print("3. Use the DevDocs UI to view the content in the browser")
        else:
            print("\n=== Health check failed, cannot proceed with tests ===")
            sys.exit(1)
    else:
        print("\n=== Ping test failed, cannot proceed with tests ===")
        sys.exit(1)