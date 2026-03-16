"""
Custom JSON-based job store for APScheduler
Persists scheduled jobs to JSON files, compatible with the project's JSON-based data architecture
"""
import json
from pathlib import Path
from datetime import datetime
from apscheduler.jobstores.base import BaseJobStore, JobLookupError
from apscheduler.util import datetime_to_utc_timestamp, utc_timestamp_to_datetime
from apscheduler.job import Job


class JSONJobStore(BaseJobStore):
    """
    A job store that persists jobs to a JSON file using APScheduler's state serialization.
    Matches the project's data architecture using JSON files in the data/ directory.
    """
    
    def __init__(self, data_dir: str = None):
        """
        Initialize the JSON job store.
        
        Args:
            data_dir: Path to the data directory where jobs.json will be stored.
                     Defaults to backend/data/
        """
        super().__init__()
        
        if data_dir is None:
            # Default to backend/data/ directory
            data_dir = Path(__file__).parents[3] / "data"
        else:
            data_dir = Path(data_dir)
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.jobs_file = self.data_dir / "scheduled_jobs.json"
        self._load_jobs()
    
    def _load_jobs(self):
        """Load jobs from JSON file into memory."""
        self._jobs = {}
        
        if self.jobs_file.exists():
            try:
                with open(self.jobs_file, 'r') as f:
                    data = json.load(f)
                    raw_jobs = data.get('jobs', {})
                    # Filter out jobs missing 'trigger' — they are corrupt/incomplete stubs
                    corrupt_ids = [jid for jid, jstate in raw_jobs.items() if 'trigger' not in jstate]
                    if corrupt_ids:
                        print(f"🧹 Removing {len(corrupt_ids)} corrupt job(s) missing 'trigger': {corrupt_ids}")
                        for jid in corrupt_ids:
                            del raw_jobs[jid]
                    self._jobs = raw_jobs
                    print(f"📂 Loaded {len(self._jobs)} jobs from {self.jobs_file}")
                    # Persist cleaned state immediately
                    if corrupt_ids:
                        self._save_jobs()
            except Exception as e:
                print(f"⚠️ Error loading jobs from {self.jobs_file}: {e}")
                self._jobs = {}
        else:
            print(f"📝 Created new job store at {self.jobs_file}")
    
    def _save_jobs(self):
        """Save jobs from memory to JSON file."""
        try:
            serializable_jobs = {}
            for job_id, job_state in self._jobs.items():
                # Only save essential fields that are JSON serializable
                job_data = {
                    'id': job_state.get('id'),
                    'func': job_state.get('func'),
                    'args': job_state.get('args', []),
                    'kwargs': job_state.get('kwargs', {}),
                    'name': job_state.get('name'),
                    'misfire_grace_time': job_state.get('misfire_grace_time'),
                    'coalesce': job_state.get('coalesce'),
                    'max_instances': job_state.get('max_instances'),
                    'next_run_time': job_state.get('next_run_time'),  # Will be serialized as string
                }
                serializable_jobs[job_id] = job_data
            
            with open(self.jobs_file, 'w') as f:
                json.dump({
                    'jobs': serializable_jobs,
                    'last_updated': datetime.utcnow().isoformat(),
                }, f, indent=2, default=str)
            print(f"💾 Saved {len(serializable_jobs)} jobs to {self.jobs_file}")
        except Exception as e:
            print(f"❌ Error saving jobs to {self.jobs_file}: {e}")
    
    def add_job(self, job: Job):
        """Add a job to the store."""
        job_state = job.__getstate__()
        self._jobs[job.id] = job_state
        self._save_jobs()
        print(f"➕ Job '{job.id}' added to store (runs at {job.next_run_time})")
    
    def update_job(self, job: Job):
        """Update an existing job in the store."""
        if job.id not in self._jobs:
            raise JobLookupError(job.id)
        
        job_state = job.__getstate__()
        self._jobs[job.id] = job_state
        self._save_jobs()
        print(f"♻️ Job '{job.id}' updated")
    
    def remove_job(self, job_id: str):
        """Remove a job from the store."""
        if job_id not in self._jobs:
            raise JobLookupError(job_id)
        
        del self._jobs[job_id]
        self._save_jobs()
        print(f"🗑️ Job '{job_id}' removed from store")
    
    def remove_all_jobs(self):
        """Remove all jobs from the store."""
        self._jobs = {}
        self._save_jobs()
        print("🗑️ All jobs removed from store")
    
    def load_job(self, job_id: str):
        """Load a single job by ID."""
        if job_id not in self._jobs:
            raise JobLookupError(job_id)
        
        job_state = self._jobs[job_id]
        return self._deserialize_job(job_state)
    
    def lookup_job(self, job_id: str):
        """Look up a job by ID (alias for load_job)."""
        return self.load_job(job_id)
    
    def get_due_jobs(self, now):
        """Get all jobs that are due to run."""
        due_jobs = []
        
        for job_id, job_state in list(self._jobs.items()):
            next_run_time = job_state.get('next_run_time')
            if next_run_time is not None:
                if isinstance(next_run_time, str):
                    try:
                        next_run_time = datetime.fromisoformat(next_run_time.replace('Z', '+00:00'))
                    except:
                        pass
                
                try:
                    if next_run_time <= now:
                        job = self._deserialize_job(job_state)
                        due_jobs.append(job)
                except Exception as e:
                    print(f"⚠️ Removing corrupt job '{job_id}': {e}")
                    del self._jobs[job_id]
                    self._save_jobs()
        
        return due_jobs
    
    def get_next_run_time(self):
        """Get the next run time of all jobs."""
        next_run_times = []
        
        for job_state in self._jobs.values():
            next_run_time = job_state.get('next_run_time')
            if next_run_time is not None:
                next_run_times.append(next_run_time)
        
        if not next_run_times:
            return None
        
        # Find the minimum datetime
        min_time = None
        for nrt in next_run_times:
            try:
                if isinstance(nrt, str):
                    dt = datetime.fromisoformat(nrt.replace('Z', '+00:00'))
                else:
                    dt = nrt
                
                if min_time is None or dt < min_time:
                    min_time = dt
            except:
                pass
        
        return min_time
    
    def get_all_jobs(self):
        """Get all jobs."""
        jobs = []
        for job_id, job_state in list(self._jobs.items()):
            try:
                job = self._deserialize_job(job_state)
                jobs.append(job)
            except Exception as e:
                print(f"⚠️ Removing corrupt job '{job_id}': {e}")
                del self._jobs[job_id]
                self._save_jobs()
        
        return jobs
    
    def shutdown(self):
        """Shut down the job store."""
        self._save_jobs()
        print("👋 JSON job store shut down cleanly")
    
    def _deserialize_job(self, job_state: dict) -> Job:
        """Reconstruct a Job object from APScheduler state."""
        # Convert string timestamps back to datetime objects
        if 'next_run_time' in job_state and isinstance(job_state['next_run_time'], str):
            try:
                job_state['next_run_time'] = datetime.fromisoformat(job_state['next_run_time'].replace('Z', '+00:00'))
            except Exception as e:
                print(f"⚠️ Could not parse next_run_time: {e}")
                job_state['next_run_time'] = None
        
        job = Job.__new__(Job)
        job.__setstate__(job_state)
        # Set the jobstore_alias - required by APScheduler executor
        # This tells APScheduler which job store the job came from
        job._jobstore_alias = 'default'
        return job
