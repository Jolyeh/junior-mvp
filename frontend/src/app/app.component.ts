import { Component, computed, inject, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, BookOpen, LayoutDashboard, Library, GraduationCap, Users, Settings, Search, Bell, ChevronDown, ChevronRight, ArrowRight, ArrowUpRight, Download, Eye, FileText, Plus, SlidersHorizontal, LogOut, X, Upload, ShieldCheck, BookMarked, Layers, Trash2, Pencil, Menu } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthService } from './auth.service';
import { Category, DocumentItem, LibraryService } from './library.service';
gsap.registerPlugin(ScrollTrigger);
@Component({ selector:'app-root', standalone:true, imports:[CommonModule, FormsModule, LucideAngularModule], templateUrl:'./app.component.html', styleUrl:'./app.component.scss' })
export class AppComponent implements AfterViewInit {
 readonly icons = { BookOpen, LayoutDashboard, Library, GraduationCap, Users, Settings, Search, Bell, ChevronDown, ChevronRight, ArrowRight, ArrowUpRight, Download, Eye, FileText, Plus, SlidersHorizontal, LogOut, X, Upload, ShieldCheck, BookMarked, Layers, Trash2, Pencil, Menu };
 auth = inject(AuthService); api = inject(LibraryService);
 documents = signal<DocumentItem[]>([]); filieres = signal<Category[]>([]); niveaux = signal<Category[]>([]); matieres = signal<Category[]>([]);
 search = signal(''); niveau = signal(''); matiere = signal('');
 filtered = computed(() => this.documents().filter(d => (!this.niveau() || d.niveau.id === this.niveau()) && (!this.matiere() || d.matiere.id === this.matiere()) && (!this.search() || (d.title + ' ' + d.matiere.name).toLowerCase().includes(this.search().toLowerCase()))));
 view = signal<'catalogue'|'management'>('catalogue'); modal = signal<'login'|'register'|'upload'|null>(null); busy = signal(false); message = signal(''); error = signal(''); menuOpen = signal(false);
 email = ''; password = ''; matricule = '';
 uploadTitle = ''; uploadDescription = ''; uploadFiliere = ''; uploadNiveau = ''; uploadMatiere = ''; uploadFile?: File;
 managementType = signal('filieres'); rows = signal<any[]>([]); form: any = {}; editingId = ''; importFile?: File;
 constructor() { if(this.auth.user()) this.refresh(); }
 ngAfterViewInit() { gsap.from('.animate-in', { y:18, opacity:0, stagger:.08, duration:.6, ease:'power2.out' }); }
 refresh() { this.api.documents().subscribe({next:d => { this.documents.set(d); setTimeout(() => { gsap.fromTo('.document-card', {opacity:0,y:16}, {opacity:1,y:0,stagger:.05,duration:.4,scrollTrigger:{trigger:'.documents-grid',start:'top 95%'}}); }, 0); }, error:e => this.handle(e)}); for (const [type, target] of [['filieres',this.filieres],['niveaux',this.niveaux],['matieres',this.matieres]] as const) this.api.categories(type).subscribe({next:v => target.set(v),error:e => this.handle(e)}); }
 handle(e: any) { if(e.status === 401 && this.auth.user()) { this.auth.logout(); this.error.set('Votre session a expiré. Veuillez vous reconnecter.'); } else this.error.set(typeof e.error?.message === 'string' ? e.error.message : 'Une erreur est survenue. Veuillez réessayer.'); }
 submitAuth() { this.error.set(''); this.busy.set(true); const request = this.modal() === 'register' ? this.auth.register(this.matricule,this.email,this.password) : this.auth.login(this.email,this.password); request.subscribe({next:() => {this.busy.set(false); this.modal.set(null); this.password=''; this.refresh();},error:e=>{this.busy.set(false);this.handle(e);}}); }
 logout() { this.auth.logout(); this.documents.set([]); this.view.set('catalogue'); this.message.set(''); }
 openFile(doc: DocumentItem, download: boolean) { this.api.file(doc.id, download).subscribe({ next: blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; if(download) a.download=doc.title+'.pdf'; else { a.target='_blank'; a.rel='noopener'; } a.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); }, error:e=>this.handle(e) }); }
 selectedFile(event: Event, kind: 'upload'|'import') { const file = (event.target as HTMLInputElement).files?.[0]; if(kind==='upload') this.uploadFile=file; else this.importFile=file; }
 submitUpload() { if(!this.uploadFile) { this.error.set('Veuillez sélectionner un PDF.'); return; } const data = new FormData(); data.append('file',this.uploadFile); for(const [k,v] of Object.entries({title:this.uploadTitle,description:this.uploadDescription,filiereId:this.uploadFiliere,niveauId:this.uploadNiveau,matiereId:this.uploadMatiere})) data.append(k,v); this.busy.set(true); this.api.upload(data).subscribe({next:()=>{this.busy.set(false);this.modal.set(null);this.message.set('Document ajouté avec succès.');this.uploadTitle='';this.uploadDescription='';this.uploadFile=undefined;this.refresh();},error:e=>{this.busy.set(false);this.handle(e);}}); }
 deleteDocument(doc: DocumentItem) { if(confirm('Supprimer ce document ?')) this.api.removeDocument(doc.id).subscribe({next:()=>this.refresh(),error:e=>this.handle(e)}); }
 manage(type: string) { this.view.set('management'); this.managementType.set(type); this.form=type === 'students' ? { isEligible: true } : {}; this.editingId=''; this.loadRows(); }
 loadRows() { this.api.rows(this.managementType()).subscribe({next:r=>this.rows.set(r),error:e=>this.handle(e)}); }
 edit(row: any) { this.editingId=row.id; this.form={...row}; }
 saveRow() { const type=this.managementType(); const fields=type==='students'?['matricule','firstName','lastName','filiereId','niveauId','isEligible']:type==='niveaux'?['code','name','sortOrder']:['code','name']; const data:any={}; fields.forEach(k=>{if(this.form[k]!==undefined && this.form[k]!=='') data[k]=this.form[k]}); const req=this.editingId?this.api.update(type,this.editingId,data):this.api.create(type,data); req.subscribe({next:()=>{this.form=type === 'students' ? { isEligible: true } : {};this.editingId='';this.loadRows();this.refresh();this.message.set('Enregistrement sauvegardé.');},error:e=>this.handle(e)}); }
 removeRow(row:any) { if(confirm('Supprimer cet enregistrement ?')) this.api.remove(this.managementType(),row.id).subscribe({next:()=>{this.loadRows();this.refresh()},error:e=>this.handle(e)}); }
 importRows() { if(!this.importFile) return; this.api.import(this.managementType(),this.importFile).subscribe({next:(r:any)=>{this.message.set(`${r.imported} ligne(s) importée(s).`);this.loadRows();this.refresh()},error:e=>this.handle(e)}); }
 exportRows(format: string) { this.api.export(this.managementType(),format).subscribe({next:b=>{const u=URL.createObjectURL(b); const a=document.createElement('a');a.href=u;a.download=`${this.managementType()}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)},error:e=>this.handle(e)}); }
 get managementLabel() { return ({filieres:'Filières',niveaux:'Niveaux',matieres:'Matières',students:'Étudiants'} as Record<string,string>)[this.managementType()]; }
}
