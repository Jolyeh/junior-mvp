import { API_BASE_URL } from './api-config';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
export interface Category { id: string; code: string; name: string; filieres?: {id:string;name:string}[]; }
export interface DocumentItem { id: string; title: string; description?: string; sizeBytes: number; createdAt: string; filiere: Category; niveau: Category; matiere: Category; }
@Injectable({providedIn:'root'})
export class LibraryService {
 private http = inject(HttpClient);
 categories(type: string) { return this.http.get<Category[]>(`${API_BASE_URL}/academic/${type}`); }
 documents(search = '', niveauId = '', matiereId = '') { return this.http.get<DocumentItem[]>(`${API_BASE_URL}/documents`, { params: new HttpParams().set('search',search).set('niveauId',niveauId).set('matiereId',matiereId) }); }
 file(id: string, download = false) { return this.http.get(`${API_BASE_URL}/documents/${id}/file`, { params: { download: download ? '1' : '0' }, responseType: 'blob' }); }
 upload(data: FormData) { return this.http.post(`${API_BASE_URL}/documents`, data); }
 removeDocument(id: string) { return this.http.delete(`${API_BASE_URL}/documents/${id}`); }
 rows(type: string) { return this.http.get<any[]>(`${API_BASE_URL}/management/${type}`); }
 create(type: string, data: any) { return this.http.post(`${API_BASE_URL}/management/${type}`,data); }
 update(type: string, id: string, data: any) { return this.http.patch(`${API_BASE_URL}/management/${type}/${id}`,data); }
 remove(type: string, id: string) { return this.http.delete(`${API_BASE_URL}/management/${type}/${id}`); }
 import(type: string, file: File) { const form = new FormData(); form.append('file',file); return this.http.post(`${API_BASE_URL}/management/${type}/import`, form); }
 export(type: string, format: string) { return this.http.get(`${API_BASE_URL}/management/${type}/export`, { params: {format}, responseType: 'blob' }); }
}
