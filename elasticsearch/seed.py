import json
import urllib.request
import urllib.error
import base64

ES_URL = "http://localhost:9200"
AUTH = b'Basic ' + base64.b64encode(b'elastic:changeme')

def run_script(filepath):
    print(f"Running script: {filepath}")
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    method = None
    url = None
    body_lines = []
    
    def flush():
        nonlocal method, url, body_lines
        if method and url:
            full_url = f"{ES_URL}/{url}"
            body_str = "".join(body_lines).strip()
            body_bytes = body_str.encode('utf-8') if body_str else None
            
            req = urllib.request.Request(full_url, data=body_bytes, method=method)
            req.add_header("Authorization", AUTH)
            if body_bytes:
                req.add_header("Content-Type", "application/json")
            
            try:
                res = urllib.request.urlopen(req)
                print(f"{method} /{url} -> {res.getcode()} OK")
            except urllib.error.HTTPError as e:
                print(f"{method} /{url} -> Failed: {e.code} {e.read().decode('utf-8')}")
            except Exception as e:
                print(f"{method} /{url} -> Failed: {e}")
                
        method = None
        url = None
        body_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
            
        if stripped.startswith("GET ") or stripped.startswith("PUT ") or stripped.startswith("POST ") or stripped.startswith("DELETE "):
            flush()
            parts = stripped.split(" ", 1)
            method = parts[0]
            url = parts[1].lstrip("/")
        else:
            if method:
                body_lines.append(line)
    flush()

if __name__ == "__main__":
    run_script("elasticsearch/index-templates.ndjson")
    run_script("elasticsearch/seed-data.ndjson")
