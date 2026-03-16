"""
Analytics and reporting service - business intelligence
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta


class LeadAnalytics:
    """Lead analytics calculations"""
    
    def __init__(self):
        pass
    
    def calculate_conversion_rate(self, total_leads: int, converted_leads: int) -> float:
        """Calculate conversion rate percentage"""
        if total_leads == 0:
            return 0
        return (converted_leads / total_leads) * 100
    
    def calculate_pipeline_value(self, leads: List[Dict]) -> Dict[str, Any]:
        """Calculate total pipeline value by stage"""
        pipeline = {}
        total_value = 0
        
        for lead in leads:
            stage = lead.get('stage', 'unknown')
            deal_value = lead.get('deal_value', 0)
            
            if stage not in pipeline:
                pipeline[stage] = {'count': 0, 'value': 0}
            
            pipeline[stage]['count'] += 1
            pipeline[stage]['value'] += deal_value
            total_value += deal_value
        
        return {
            'total_value': total_value,
            'by_stage': pipeline,
            'average_deal_value': total_value / len(leads) if leads else 0
        }


class UserAnalytics:
    """User performance analytics"""
    
    def calculate_user_performance(self,
                                  leads_assigned: int,
                                  leads_converted: int,
                                  total_value_generated: int,
                                  days_period: int = 30) -> Dict[str, Any]:
        """Calculate user performance metrics"""
        conversion_rate = (leads_converted / leads_assigned * 100) if leads_assigned > 0 else 0
        average_deal_value = total_value_generated / leads_converted if leads_converted > 0 else 0
        daily_average = total_value_generated / days_period if days_period > 0 else 0
        
        return {
            'leads_assigned': leads_assigned,
            'leads_converted': leads_converted,
            'conversion_rate': conversion_rate,
            'total_value_generated': total_value_generated,
            'average_deal_value': average_deal_value,
            'daily_average_value': daily_average,
            'period_days': days_period
        }


class ActivityAnalytics:
    """Activity and engagement analytics"""
    
    def summarize_activities(self, activities: List[Dict]) -> Dict[str, Any]:
        """Summarize activities by type"""
        summary = {
            'total_activities': len(activities),
            'by_type': {},
            'by_date': {}
        }
        
        for activity in activities:
            action = activity.get('action', 'unknown')
            created_at = activity.get('created_at', '')
            
            # Count by type
            if action not in summary['by_type']:
                summary['by_type'][action] = 0
            summary['by_type'][action] += 1
            
            # Count by date
            date_key = created_at[:10] if created_at else 'unknown'
            if date_key not in summary['by_date']:
                summary['by_date'][date_key] = 0
            summary['by_date'][date_key] += 1
        
        return summary


class AnalyticsService:
    """Main analytics service"""
    
    def __init__(self):
        self.lead_analytics = LeadAnalytics()
        self.user_analytics = UserAnalytics()
        self.activity_analytics = ActivityAnalytics()
    
    def get_lead_conversion_report(self, leads: List[Dict]) -> Dict[str, Any]:
        """Generate lead conversion report"""
        total_leads = len(leads)
        converted = sum(1 for l in leads if l.get('stage') in ['won', 'closed'])
        
        return {
            'total_leads': total_leads,
            'converted_leads': converted,
            'conversion_rate': self.lead_analytics.calculate_conversion_rate(total_leads, converted),
            'period': 'last_30_days'
        }
    
    def get_pipeline_value_report(self, leads: List[Dict]) -> Dict[str, Any]:
        """Generate pipeline value report"""
        return self.lead_analytics.calculate_pipeline_value(leads)
    
    def get_user_performance_report(self,
                                   user_id: str,
                                   leads_assigned: int,
                                   leads_converted: int,
                                   total_value: int) -> Dict[str, Any]:
        """Generate user performance report"""
        return {
            'user_id': user_id,
            **self.user_analytics.calculate_user_performance(leads_assigned, leads_converted, total_value)
        }
    
    def get_activity_summary(self, activities: List[Dict]) -> Dict[str, Any]:
        """Generate activity summary report"""
        return self.activity_analytics.summarize_activities(activities)
