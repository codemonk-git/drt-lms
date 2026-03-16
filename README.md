# Lead Management System

A comprehensive lead management platform with a Flutter mobile app, Angular web dashboard, and Python/FastAPI backend.

## Project Structure

```
├── tss_leads/              # Flutter mobile app
│   ├── lib/
│   ├── android/
│   ├── ios/
│   ├── pubspec.yaml
│   └── ...
├── angular-app/            # Angular web dashboard
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── ...
├── backend/                # Python FastAPI backend
│   ├── server/
│   │   ├── domains/        # Feature domains
│   │   ├── middleware/
│   │   ├── config/
│   │   └── main.py
│   ├── data/               # JSON data files
│   ├── main.py
│   ├── requirements.txt
│   └── .env
└── data/                   # Database structure docs
```

## Features

### Lead Management

- ✅ Create, read, update, delete leads
- ✅ Track lead source and campaign
- ✅ Pipeline stage management
- ✅ Call status tracking
- ✅ Lead assignment to users/teams
- ✅ Activity logging with user tracking
- ✅ Creator identification with user name lookup
- ✅ Follow-ups scheduling
- ✅ Notes and attachments

### Activity Tracking

- ✅ Automatically log all lead changes
- ✅ Display creator names in activity log
- ✅ Stage transitions with "From → To" format
- ✅ Call status changes tracking
- ✅ User-based activity filtering

### Core Improvements (Latest)

- ✅ Lead creation with automatic assignment to creator
- ✅ Creator tracking with `created_by_user_id` and `created_by_user_name`
- ✅ Proper enum serialization in API responses
- ✅ User name lookup from database for activities and leads
- ✅ Project details section showing creator and source
- ✅ Email field always visible (even when empty)
- ✅ Schedule followup button always accessible
- ✅ Activity pagination fixed (limit: 500)

## Tech Stack

### Frontend (Flutter)

- Flutter with Provider state management
- Material Design UI
- RESTful API integration
- Firebase messaging
- Speech-to-text capabilities

### Web Dashboard (Angular)

- Angular 16+
- TypeScript
- RxJS for reactive programming
- RESTful API integration

### Backend (Python)

- FastAPI
- SQLite JSON storage (file-based)
- APScheduler for job scheduling
- Firebase integration
- Pydantic models for validation

## Setup & Installation

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs on `http://0.0.0.0:8000`

### Flutter Setup

```bash
cd tss_leads
flutter pub get
flutter run
```

### Angular Setup

```bash
cd angular-app
npm install
npm start
```

## API Endpoints

### Leads

- `GET /api/leads` - List leads
- `GET /api/leads/{lead_id}` - Get lead details
- `POST /api/leads` - Create lead
- `PUT /api/leads/{lead_id}` - Update lead
- `DELETE /api/leads/{lead_id}` - Delete lead

### Activities

- `GET /api/leads/{lead_id}/activities` - Get lead activities
- `POST /api/activities` - Log activity

### Followups

- `GET /api/leads/{lead_id}/followups` - Get scheduled followups
- `POST /api/leads/{lead_id}/followups` - Schedule followup
- `DELETE /api/leads/{lead_id}/followups/{followup_id}` - Cancel followup

## Key Data Models

### Lead

```json
{
  "id": "uuid",
  "name": "Lead Name",
  "phone": "1234567890",
  "email": "lead@example.com",
  "source": "facebook",
  "stage": "new",
  "call_status": "not_called",
  "created_by_user_id": "user_id",
  "created_by_user_name": "John Doe",
  "assigned_to_user_id": "user_id",
  "next_followup_date_time": "2026-03-16T10:00:00Z"
}
```

### Activity

```json
{
  "id": "uuid",
  "type": "stage_changed",
  "user_id": "user_id",
  "user_name": "John Doe",
  "entity_type": "lead",
  "entity_id": "lead_id",
  "description": "Stage changed",
  "metadata": {
    "old_stage_name": "New",
    "new_stage_name": "Contacted"
  },
  "created_at": "2026-03-16T10:00:00Z"
}
```

## Recent Fixes

### Creator Tracking

- Added `created_by_user_id` field to Lead model
- Backend looks up actual creator name via UserRepository
- Flutter displays creator name in PROJECT DETAILS section

### Enum Serialization

- Fixed backend to convert enums to string values in responses
- `call_status`, `stage`, `source`, `status` now properly serialized

### Activity Display

- Creator names show as "by [Name]" in activity timeline
- Proper user name lookup for all activities
- Activity pagination increased to 500 items

### Lead Detail View

- Email field always visible (shows "No email" when empty)
- Schedule followup button always accessible
- Created by and Source info in PROJECT DETAILS
- No duplicate note icons

## Environment Setup

Create `.env` file in backend directory:

```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## Git Workflow

```bash
# Clone repository
git clone <repo-url>
cd ang_exp

# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Feature: description"

# Push to remote
git push origin feature/your-feature

# Create Pull Request on GitHub
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request

## License

Private Project

## Contact

For questions or support, contact the development team.
