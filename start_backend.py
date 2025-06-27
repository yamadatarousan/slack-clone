#!/usr/bin/env python3
import subprocess
import sys
import os

# Change to backend directory
os.chdir('/Users/user/Development/slack-clone/backend')

# Start the server
try:
    subprocess.run([
        sys.executable, '-m', 'uvicorn', 
        'app.main:app', 
        '--reload', 
        '--host', '0.0.0.0', 
        '--port', '8000'
    ])
except KeyboardInterrupt:
    print("Server stopped")