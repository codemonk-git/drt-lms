import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { UserService } from './user.service';
import { Team, TeamMember } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  constructor(
    private apiService: ApiService,
    private userService: UserService,
  ) {}

  getTeams(skip: number = 0, limit: number = 10): Observable<Team[]> {
    return this.apiService.getPaginated<Team>('/teams', skip, limit).pipe(
      map((response: any) => {
        const teams = response.data || [];
        return teams;
      }),
    );
  }

  getTeam(id: string): Observable<Team> {
    return this.apiService.get<Team>(`/teams/${id}`).pipe(map((response) => response.data!));
  }

  createTeam(team: Partial<Team>): Observable<Team> {
    return this.apiService.post<Team>('/teams', team).pipe(map((response) => response.data!));
  }

  updateTeam(id: string, team: Partial<Team>): Observable<Team> {
    return this.apiService.put<Team>(`/teams/${id}`, team).pipe(map((response) => response.data!));
  }

  deleteTeam(id: string): Observable<void> {
    return this.apiService.delete<void>(`/teams/${id}`).pipe(map(() => undefined));
  }

  getTeamMembers(teamId: string): Observable<TeamMember[]> {
    return this.apiService.get<TeamMember[]>(`/teams/${teamId}/members`).pipe(
      map((response) => {
        const members = Array.isArray(response.data) ? response.data : [];
        return members;
      }),
    );
  }

  addTeamMember(teamId: string, userId: string): Observable<TeamMember> {
    return this.apiService
      .post<TeamMember>(`/teams/${teamId}/members`, { user_id: userId })
      .pipe(map((response) => response.data!));
  }

  removeTeamMember(teamId: string, memberId: string): Observable<void> {
    return this.apiService
      .delete<void>(`/teams/${teamId}/members/${memberId}`)
      .pipe(map(() => undefined));
  }

  getTeamActivity(teamId: string, skip: number = 0, limit: number = 50): Observable<any[]> {
    return this.apiService.get<any[]>(`/teams/${teamId}/activity?skip=${skip}&limit=${limit}`).pipe(
      map((response) => {
        const activities = Array.isArray(response.data) ? response.data : [];
        return activities;
      }),
    );
  }
}
