import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
export interface Category { id: string; code: string; name: string; }
export interface DocumentItem { id: string; title: string; description?: string; sizeBytes: number; createdAt: string; filiere: Category; niveau: Category; matiere: Category; }
@Injectable({providedIn:'root'})
export class LibraryService {
 private http = inject(HttpClient);
 categories(type: string) { return this.http.get<Category[]>(`/api/academic/${type}`); }
 documents(search = '', niveauId = '', matiereId = '') { return this.http.get<DocumentItem[]>('/api/documents', { params: new HttpParams().set('search',search).set('niveauId',niveauId).set('matiereId',matiereId) }); }
 file(id: string, download = false) { return this.http.get(`/api/documents/${id}/file`, { params: { download: download ? '1' : '0' }, responseType: 'blob' }); }
 upload(data: FormData) { return this.http.post('/api/documents', data); }
 removeDocument(id: string) { return this.http.delete(`/api/documents/${id}`); }
 rows(type: string) { return this.http.get<any[]>(`/api/management/${type}`); }
 create(type: string, data: any) { return this.http.post(`/api/management/${type}`,data); }
 update(type: string, id: string, data: any) { return this.http.patch(`/api/management/${type}/${id}`,data); }
 remove(type: string, id: string) { return this.http.delete(`/api/management/${type}/${id}`); }
 import(type: string, file: File) { const form = new FormData(); form.append('file',file); return this.http.post(`/api/management/${type}/import`, form); }
 export(type: string, format: string) { return this.http.get(`/api/management/${type}/export`, { params: {format}, responseType: 'blob' }); }
}
