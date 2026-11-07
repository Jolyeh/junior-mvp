import { API_BASE_URL } from './api-config';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { switchMap } from 'rxjs';
export interface Category { id: string; code: string; name: string; filieres?: {id:string;name:string}[]; }
export interface DocumentItem { id: string; title: string; description?: string; sizeBytes: number; createdAt: string; matiere: Category; niveau: Category | null; }
@Injectable({providedIn:'root'})
export class LibraryService {
 private http = inject(HttpClient);
 categories(type: string) { return this.http.get<Category[]>(`${API_BASE_URL}/academic/${type}`); }
 documents(search = '', niveauId = '', matiereId = '') { return this.http.get<DocumentItem[]>(`${API_BASE_URL}/documents`, { params: new HttpParams().set('search',search).set('niveauId',niveauId).set('matiereId',matiereId) }); }
 file(id: string, download = false) { return this.http.get<{url:string}>(`${API_BASE_URL}/documents/${id}/file`, { params: { download: download ? '1' : '0' } }); }
 upload(file:File, data:{title:string;description:string;matiereId:string;niveauId:string}) { return this.http.post<{ticketId:string;url:string;fields:Record<string,string|number|boolean>}>(`${API_BASE_URL}/documents/upload-intent`,{...data,originalName:file.name,sizeBytes:file.size}).pipe(switchMap(intent=>{ const url=new URL(intent.url);if(url.protocol!=='https:' || url.hostname!=='api.cloudinary.com')throw new Error('URL de stockage invalide');const form=new FormData();for(const [key,value] of Object.entries(intent.fields))form.append(key,String(value));form.append('file',file);return this.http.post(url.href,form).pipe(switchMap(()=>this.http.post(`${API_BASE_URL}/documents/upload-finish`,{ticketId:intent.ticketId})));})); }
 removeDocument(id: string) { return this.http.delete(`${API_BASE_URL}/documents/${id}`); }
 rows(type: string) { return this.http.get<any[]>(`${API_BASE_URL}/management/${type}`); }
 create(type: string, data: any) { return this.http.post(`${API_BASE_URL}/management/${type}`,data); }
 update(type: string, id: string, data: any) { return this.http.patch(`${API_BASE_URL}/management/${type}/${id}`,data); }
 remove(type: string, id: string) { return this.http.delete(`${API_BASE_URL}/management/${type}/${id}`); }
 import(type: string, file: File) { const form = new FormData(); form.append('file',file); return this.http.post(`${API_BASE_URL}/management/${type}/import`, form); }
 export(type: string, format: string) { return this.http.get(`${API_BASE_URL}/management/${type}/export`, { params: {format}, responseType: 'blob' }); }
}
