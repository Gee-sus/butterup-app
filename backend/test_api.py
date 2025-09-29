#!/usr/bin/env python
import requests
import json

def test_api_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    endpoints = [
        "/api/stores/",
        "/api/stores/by-chain/paknsave/",
        "/api/products/",
        "/api/stores/chains/"
    ]
    
    print("Testing API endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        try:
            url = base_url + endpoint
            response = requests.get(url)
            print(f"✅ {endpoint}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data:
                    print(f"   Results: {len(data['results'])} items")
                elif 'stores' in data:
                    print(f"   Stores: {len(data['stores'])} items")
                elif 'chains' in data:
                    print(f"   Chains: {data['chains']}")
                else:
                    print(f"   Data: {type(data)}")
            else:
                print(f"   Error: {response.text[:100]}...")
                
        except Exception as e:
            print(f"❌ {endpoint}")
            print(f"   Error: {str(e)}")
        
        print()

if __name__ == "__main__":
    test_api_endpoints()












