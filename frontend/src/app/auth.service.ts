import { API_BASE_URL, isApiRequest } from './api-config';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
export interface Session { accessToken: string; user: { id: string; email: string; role: string; student?: { firstName: string; lastName: string; matricule: string; filiereId: string } } }
@Injectable({ providedIn: 'root' })
export class AuthService {
 private http = inject(HttpClient);
 session = signal<Session | null>(this.load());
 user = computed(() => this.session()?.user ?? null);
 isManager = computed(() => ['MANAGER', 'ADMIN'].includes(this.user()?.role ?? ''));
 private load(): Session | null { try { return JSON.parse(sessionStorage.getItem('session') || 'null'); } catch { return null; } }
 private save(session: Session) { sessionStorage.setItem('session', JSON.stringify(session)); this.session.set(session); }
 login(email: string, password: string) { return this.http.post<Session>(`${API_BASE_URL}/auth/login`, { email, password }).pipe(tap(s => this.save(s))); }
 register(matricule: string, email: string, password: string) { return this.http.post<Session>(`${API_BASE_URL}/auth/register`, { matricule, email, password }).pipe(tap(s => this.save(s))); }
 logout() { sessionStorage.removeItem('session'); this.session.set(null); }
}
export const authInterceptor: HttpInterceptorFn = (req, next) => { const auth = inject(AuthService); const token = auth.session()?.accessToken; return next(token && isApiRequest(req.url) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req); };
