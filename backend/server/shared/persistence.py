"""
JSON Persistence Mixin for Repositories
Provides automatic load/save functionality from JSON files in the data/ directory
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional


class JSONPersistenceMixin:
    """Mixin to add JSON file persistence to repositories"""
    
    DATA_DIR = Path(__file__).parent.parent.parent / "data"  # /backend/data
    FILENAME = "data.json"  # Override in subclass
    
    def __init__(self):
        """Initialize and load from JSON file if it exists"""
        self.DATA_DIR.mkdir(exist_ok=True)
        self._load_from_file()
    
    def _get_filepath(self):
        """Get the filepath for this repository's data"""
        return self.DATA_DIR / self.FILENAME
    
    def _load_from_file(self, force=False):
        """Load data from JSON file if it exists. Set force=True to reload even if already loaded."""
        # Always reload from file to ensure fresh data for multi-process/multi-request scenarios
        filepath = self._get_filepath()
        if filepath.exists():
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    self._load_data(data)
            except Exception as e:
                print(f"Warning: Could not load {filepath}: {e}")
    
    def _save_to_file(self):
        """Save data to JSON file"""
        try:
            filepath = self._get_filepath()
            data = self._get_data()
            
            # Serialize objects to dicts
            serialized = self._serialize_data(data)
            
            # Verify serialization worked
            if not serialized:
                print(f"⚠️ WARNING: No data to save to {filepath.name}")
                return
            
            with open(filepath, 'w') as f:
                json.dump(serialized, f, indent=2, default=str)
            
            # Verify file was written
            if filepath.exists():
                file_size = filepath.stat().st_size
                print(f"✅ Saved data to {filepath.name} ({file_size} bytes)")
            else:
                print(f"❌ ERROR: File was not created at {filepath}")
        except Exception as e:
            print(f"❌ ERROR: Could not save to {filepath}: {e}")
            import traceback
            traceback.print_exc()
    
    def _serialize_data(self, data: Any) -> Any:
        """Recursively serialize data objects to dictionaries"""
        if hasattr(data, 'to_dict'):
            return data.to_dict()
        elif isinstance(data, dict):
            return {k: self._serialize_data(v) for k, v in data.items()}
        elif isinstance(data, (list, tuple)):
            return [self._serialize_data(item) for item in data]
        elif hasattr(data, '__dict__') and not isinstance(data, type):
            return self._serialize_data(data.__dict__)
        else:
            return data
    
    def _ensure_fresh_data(self):
        """Reload data from file before reads - ensures data is current in multi-request scenarios"""
        self._load_from_file()
    
    def _load_data(self, data: Dict):
        """Override in subclass to load data from dict"""
        pass
    
    def _get_data(self) -> Dict:
        """Override in subclass to return data as dict"""
        return {}
