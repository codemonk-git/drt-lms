"""
Lead services - business logic for lead management
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from .models import Lead, LeadStage, LeadSource, CallStatus, LeadActivity, LeadAssignment
from .repositories import LeadRepository, LeadActivityRepository, LeadAssignmentRepository


class LeadService:
    """Main lead service"""
    
    def __init__(self, 
                 lead_repo: LeadRepository = None,
                 activity_repo: LeadActivityRepository = None,
                 assignment_repo: LeadAssignmentRepository = None):
        self.lead_repo = lead_repo or LeadRepository()
        self.activity_repo = activity_repo or LeadActivityRepository()
        self.assignment_repo = assignment_repo or LeadAssignmentRepository()
    
    def create_lead(self,
                   company_id: str,
                   name: str = None,
                   **kwargs) -> Lead:
        """Create new lead"""
        lead = Lead(company_id=company_id, name=name, **kwargs)
        saved_lead = self.lead_repo.save(lead)
        
        # Log activity for lead creation
        try:
            from server.domains.activities.services import ActivityService
            from server.domains.activities.models import ActivityType
            activity_service = ActivityService()
            activity_service.log_activity(
                company_id=company_id,
                user_id=kwargs.get('created_by_user_id', 'system'),
                activity_type=ActivityType.LEAD_CREATED,
                entity_type='lead',
                entity_id=saved_lead.id,
                description=f'Lead created from {kwargs.get("source", "Unknown")}',
                metadata={'source': kwargs.get('source', 'Unknown')}
            )
        except Exception as e:
            print(f"Failed to log lead creation activity: {e}")
        
        return saved_lead
    
    def get_lead(self, lead_id: str) -> Optional[Lead]:
        """Get lead by ID"""
        return self.lead_repo.get_by_id(lead_id)
    
    def list_company_leads(self, company_id: str) -> List[Lead]:
        """List all leads for company"""
        return self.lead_repo.get_by_company(company_id)
    
    def list_leads(self, skip: int = 0, limit: int = 50, company_id: str = None) -> List[Lead]:
        """List leads with pagination and optional company filter"""
        if company_id:
            leads = self.lead_repo.get_by_company(company_id)
        else:
            leads = list(self.lead_repo.data.values()) if hasattr(self.lead_repo, 'data') else []
        
        return leads[skip:skip + limit]
    
    def update_lead(self, lead_id: str, **kwargs) -> Optional[Lead]:
        """Update lead"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead:
            return None
        
        # Track old stage for activity logging
        old_stage_id = lead.stage_id
        # Resolve old_stage_name: use string value, converting enum if needed
        _raw_stage = lead.stage
        old_stage_name = _raw_stage.value if hasattr(_raw_stage, 'value') else str(_raw_stage)
        
        for key, value in kwargs.items():
            if hasattr(lead, key):
                setattr(lead, key, value)
        
        lead.updated_at = datetime.utcnow()
        updated_lead = self.lead_repo.save(lead)
        
        # Log activity if stage was changed
        if 'stage_id' in kwargs and old_stage_id != kwargs['stage_id']:
            try:
                from server.domains.activities.services import ActivityService
                from server.domains.activities.models import ActivityType
                activity_service = ActivityService()
                
                # Get new stage name if available
                new_stage_name = kwargs.get('stage', 'Unknown Stage')
                
                activity_service.log_activity(
                    company_id=lead.company_id,
                    user_id=kwargs.get('updated_by_user_id', 'system'),
                    activity_type=ActivityType.LEAD_STAGE_CHANGED,
                    entity_type='lead',
                    entity_id=lead_id,
                    description=f'Stage changed to {new_stage_name}',
                    metadata={'old_stage_id': old_stage_id, 'old_stage_name': old_stage_name, 'new_stage_id': kwargs['stage_id'], 'new_stage_name': new_stage_name}
                )
            except Exception as e:
                print(f"Failed to log stage change activity: {e}")
        
        return updated_lead
    
    def delete_lead(self, lead_id: str) -> bool:
        """Delete (soft delete) a lead"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead:
            return False
        
        lead.deleted_at = datetime.utcnow()
        self.lead_repo.save(lead)
        return True
    
    def get_unassigned_leads(self, company_id: str) -> List[Lead]:
        """Get unassigned leads"""
        return self.lead_repo.get_unassigned(company_id)
    
    def list_leads_filtered(self,
                           company_id: str = None,
                           page: int = 1,
                           limit: int = 10,
                           sort: str = "created_at",
                           order: str = "desc",
                           search: str = None,
                           stage: str = None,
                           status: str = None) -> Dict:
        """List leads with filtering, sorting, and pagination"""
        # Get all leads for company or all leads
        if company_id:
            leads = self.lead_repo.get_by_company(company_id)
        else:
            leads = self.lead_repo.get_all() if hasattr(self.lead_repo, 'get_all') else []
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            leads = [l for l in leads if search_lower in getattr(l, 'name', '').lower() or
                    search_lower in getattr(l, 'email', '').lower()]
        
        # Apply stage/status filter
        if stage:
            leads = [l for l in leads if getattr(l, 'stage', None) == stage]
        if status:
            leads = [l for l in leads if getattr(l, 'status', None) == status]
        
        # Apply sorting
        reverse = (order == "desc")
        leads = sorted(leads, key=lambda x: getattr(x, sort, getattr(x, 'created_at', '')), reverse=reverse)
        
        # Apply pagination
        start = (page - 1) * limit
        end = start + limit
        paginated = leads[start:end]
        
        return {
            "data": [l.to_dict() for l in paginated],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(leads),
                "pages": (len(leads) + limit - 1) // limit
            }
        }
    
    def calculate_lead_score(self, lead_id: str) -> Dict:
        """Calculate lead scoring based on stage, deal value, and engagement"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead:
            return {"error": "Lead not found"}
        
        score = 50  # Base score
        factors = {"base": 50}
        
        # Stage scoring
        if hasattr(lead, 'stage') and lead.stage == "qualified":
            score += 30
            factors["stage"] = 30
        else:
            factors["stage"] = 0
        
        # Deal value scoring
        if hasattr(lead, 'deal_value') and lead.deal_value > 1000:
            score += 20
            factors["deal_value"] = 20
        else:
            factors["deal_value"] = 0
        
        # Engagement scoring
        if hasattr(lead, 'last_contacted_at') and lead.last_contacted_at:
            try:
                last_contact = datetime.fromisoformat(str(lead.last_contacted_at))
                days_since = (datetime.utcnow() - last_contact).days
                if days_since < 7:
                    score += 20
                    factors["engagement"] = 20
                else:
                    factors["engagement"] = 0
            except:
                factors["engagement"] = 0
        else:
            factors["engagement"] = 0
        
        # Determine grade
        if score >= 80:
            grade = "A"
        elif score >= 60:
            grade = "B"
        else:
            grade = "C"
        
        return {
            "lead_id": lead_id,
            "score": min(score, 100),
            "grade": grade,
            "factors": factors
        }
    
    def get_sales_pipeline(self, company_id: str = None) -> Dict:
        """Get sales pipeline organized by stage"""
        if company_id:
            leads = self.lead_repo.get_by_company(company_id)
        else:
            leads = self.lead_repo.get_all() if hasattr(self.lead_repo, 'get_all') else []
        
        pipeline = {}
        total_value = 0
        
        for lead in leads:
            stage = getattr(lead, 'stage', 'unknown')
            deal_value = getattr(lead, 'deal_value', 0)
            
            if stage not in pipeline:
                pipeline[stage] = {"count": 0, "value": 0}
            
            pipeline[stage]["count"] += 1
            pipeline[stage]["value"] += deal_value
            total_value += deal_value
        
        return {
            "pipeline": pipeline,
            "total_leads": len(leads),
            "total_value": total_value,
            "by_stage_count": {stage: data["count"] for stage, data in pipeline.items()}
        }
    
    # ===== FOLLOWUP MANAGEMENT =====
    
    def schedule_followup(self, lead_id: str, company_id: str, scheduled_for: str,
                         notes: str = None) -> Optional[Lead]:
        """Schedule a followup for a lead"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead:
            return None
        
        # Set followup fields
        lead.next_followup_date_time = scheduled_for
        lead.followup_notes = notes
        lead.updated_at = datetime.utcnow()
        
        # Save and return
        saved_lead = self.lead_repo.save(lead)
        
        # Log activity
        try:
            from server.domains.activities.services import ActivityService
            from server.domains.activities.models import ActivityType
            activity_service = ActivityService()
            activity_service.log_activity(
                company_id=company_id,
                user_id='system',
                activity_type=ActivityType.FOLLOWUP_SCHEDULED,
                entity_type='lead',
                entity_id=lead_id,
                description=f'Followup scheduled for {scheduled_for}',
                metadata={'scheduled_for': scheduled_for}
            )
        except Exception as e:
            print(f"Failed to log followup activity: {e}")
        
        return saved_lead
    
    def complete_followup(self, lead_id: str) -> Optional[Lead]:
        """Mark followup as completed (clears the followup)"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead or not lead.next_followup_date_time:
            return None
        
        # Clear the followup fields
        lead.next_followup_date_time = None
        lead.followup_notes = None
        lead.updated_at = datetime.utcnow()
        
        return self.lead_repo.save(lead)
    
    def delete_followup(self, lead_id: str) -> Optional[Lead]:
        """Delete/cancel a followup"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead or not lead.next_followup_date_time:
            return None
        
        # Remove the followup
        lead.next_followup_date_time = None
        lead.followup_notes = None
        lead.updated_at = datetime.utcnow()
        
        return self.lead_repo.save(lead)


class LeadAssignmentService:
    """Lead assignment logic - handles round-robin, auto-reassignment"""
    
    def __init__(self,
                 lead_repo: LeadRepository = None,
                 assignment_repo: LeadAssignmentRepository = None):
        self.lead_repo = lead_repo or LeadRepository()
        self.assignment_repo = assignment_repo or LeadAssignmentRepository()
    
    def assign_lead_to_user(self,
                           lead_id: str,
                           team_id: str,
                           user_id: str,
                           assigned_by: str) -> Optional[LeadAssignment]:
        """Assign lead to user"""
        lead = self.lead_repo.get_by_id(lead_id)
        if not lead:
            return None
        
        # Mark previous assignment as inactive
        prev_assignment = self.assignment_repo.get_active_by_lead(lead_id)
        if prev_assignment:
            prev_assignment.mark_inactive("reassigned")
            self.assignment_repo.save(prev_assignment)
        
        # Update lead
        lead.assign_to_user(team_id, user_id)
        self.lead_repo.save(lead)
        
        # Create new assignment record
        assignment = LeadAssignment(
            company_id=lead.company_id,
            lead_id=lead_id,
            team_id=team_id,
            user_id=user_id,
            assigned_by=assigned_by
        )
        assignment_record = self.assignment_repo.save(assignment)
        
        # Log activity for assignment
        try:
            from server.domains.activities.services import ActivityService
            from server.domains.activities.models import ActivityType
            activity_service = ActivityService()
            
            # Try to get user name for better description
            user_name = f'user {user_id[-8:]}' if user_id else 'Unknown'  # Fallback to short ID
            try:
                # Import and initialize UserService
                from server.domains.users.repositories import UserRepository
                from server.shared.database import SessionLocal
                
                db = SessionLocal()
                user_repo = UserRepository(db)
                user = user_repo.get(user_id)
                if user and hasattr(user, 'first_name'):
                    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                    if full_name:
                        user_name = full_name
                    elif hasattr(user, 'email') and user.email:
                        user_name = user.email
                db.close()
            except Exception as lookup_error:
                # Silently fail to short ID fallback
                print(f"Debug: Failed to lookup user {user_id}: {lookup_error}")
            
            activity_service.log_activity(
                company_id=lead.company_id,
                user_id=assigned_by,
                activity_type=ActivityType.LEAD_ASSIGNED,
                entity_type='lead',
                entity_id=lead_id,
                description=f'Lead assigned to {user_name}',
                metadata={'user_id': user_id, 'team_id': team_id}
            )
        except Exception as e:
            print(f"Failed to log assignment activity: {e}")
        
        return assignment_record
    
    def get_assignment_history(self, lead_id: str) -> List[LeadAssignment]:
        """Get all assignments for lead"""
        return self.assignment_repo.get_history_by_lead(lead_id)
    
    def check_stale_assignments(self, company_id: str, minutes: int = 20) -> List[str]:
        """Check for stale assignments (not contacted in X minutes)
        
        Returns list of assignment IDs that should be reassigned
        """
        from .models import LeadActivity
        
        threshold_time = datetime.utcnow() - timedelta(minutes=minutes)
        stale_assignments = []
        
        leads = self.lead_repo.get_by_company(company_id)
        for lead in leads:
            if not lead.assigned_to_user_id or lead.is_won or lead.is_lost:
                continue
            
            # Check if lead has any activity (call, sms, etc.) since assignment
            activities = self.lead_repo.activity_repo.get_by_lead(lead.id)
            recent_activity = [a for a in activities if a.created_at > lead.assigned_at]
            
            # If assigned X minutes ago and no activity, mark for reassignment
            if lead.assigned_at and lead.assigned_at < threshold_time and not recent_activity:
                assignment = self.assignment_repo.get_active_by_lead(lead.id)
                if assignment:
                    stale_assignments.append(assignment.id)
        
        return stale_assignments
    
    def round_robin_assign(self,
                          lead_id: str,
                          company_id: str,
                          team_id: str,
                          team_members: List[str],
                          assigned_by: str) -> Optional[LeadAssignment]:
        """Round-robin assign lead to next team member
        
        Args:
            lead_id: Lead to assign
            company_id: Company ID
            team_id: Team ID
            team_members: List of user IDs in team
            assigned_by: Who initiated the assignment
        """
        if not team_members:
            return None
        
        # Get assignment history to find next in round-robin
        history = self.get_assignment_history(lead_id)
        team_history = [a for a in history if a.team_id == team_id]
        
        if not team_history:
            # First assignment in this team
            next_user_idx = 0
        else:
            # Find last assigned user
            last_assigned = team_history[-1].user_id
            try:
                last_idx = team_members.index(last_assigned)
                next_user_idx = (last_idx + 1) % len(team_members)
            except ValueError:
                next_user_idx = 0
        
        next_user = team_members[next_user_idx]
        return self.assign_lead_to_user(lead_id, team_id, next_user, assigned_by)


class LeadActivityService:
    """Track lead activities"""
    
    def __init__(self, activity_repo: LeadActivityRepository = None):
        self.activity_repo = activity_repo or LeadActivityRepository()
    
    def log_activity(self,
                    company_id: str,
                    lead_id: str,
                    user_id: str,
                    activity_type: str,
                    description: str = '',
                    metadata: Dict = None) -> LeadActivity:
        """Log activity for lead"""
        activity = LeadActivity(
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            metadata=metadata or {}
        )
        return self.activity_repo.save(activity)
    
    def log_call(self,
                lead_id: str,
                company_id: str,
                user_id: str,
                call_status: str,
                duration: int = 0) -> LeadActivity:
        """Log call activity"""
        return self.log_activity(
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            activity_type='call',
            description=f'Call {call_status}',
            metadata={'call_status': call_status, 'duration': duration}
        )
    
    def log_stage_change(self,
                        lead_id: str,
                        company_id: str,
                        user_id: str,
                        from_stage: str,
                        to_stage: str) -> LeadActivity:
        """Log stage change activity"""
        return self.log_activity(
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            activity_type='stage_change',
            description=f'Stage changed from {from_stage} to {to_stage}',
            metadata={'from_stage': from_stage, 'to_stage': to_stage}
        )
    
    def get_lead_activities(self, lead_id: str) -> List[LeadActivity]:
        """Get all activities for lead"""
        return self.activity_repo.get_by_lead(lead_id)