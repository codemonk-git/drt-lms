#!/usr/bin/env python3
"""
Entry point for running the FastAPI server.
Simply run: python main.py
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set PYTHONPATH environment variable
os.environ['PYTHONPATH'] = str(backend_dir)

if __name__ == "__main__":
    import uvicorn
    from server.main import app
    
    # Run the server with hot reload enabled
    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir / "server")],
    )
