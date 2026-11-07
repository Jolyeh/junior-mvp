import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, ShieldCheck } from 'lucide-angular';
import { AuthService } from './auth.service';
import { FeedbackService } from './feedback.service';
@Component({selector:'app-auth-page', standalone:true, imports:[CommonModule,FormsModule,RouterLink,LucideAngularModule], templateUrl:'./auth-page.component.html', styleUrl:'./auth-page.component.scss'})
export class AuthPageComponent {
 auth=inject(AuthService); feedback=inject(FeedbackService); route=inject(ActivatedRoute); router=inject(Router);
 icons={ArrowLeft,ArrowRight,BookOpen,Eye,EyeOff,ShieldCheck}; mode=signal('login'); busy=signal(false); showPassword=signal(false); submitted=signal(false); done=signal('');
 email=''; password=''; confirmPassword=''; matricule=''; token='';
 constructor() { this.route.data.subscribe(data=> { this.mode.set(data['mode']); this.submitted.set(false); this.done.set(''); this.email=''; this.password=''; this.confirmPassword=''; this.matricule=''; this.showPassword.set(false); if(data['mode']==='reset') { this.token=this.route.snapshot.queryParamMap.get('token') || ''; if(this.token) history.replaceState(history.state,'',location.pathname); } }); }
 private focusInvalid(){ setTimeout(()=>document.querySelector<HTMLElement>('.auth-content [aria-invalid="true"]')?.focus()); }
 get passwordBytesTooLong(){return new TextEncoder().encode(this.password).length > 72;}
 get isNewPassword() { return this.mode()==='register' || this.mode()==='reset'; }
 submit(form:NgForm) {
  this.submitted.set(true);
  if(form.invalid) { this.focusInvalid(); return; }
  if(this.isNewPassword && this.password !== this.confirmPassword) { this.focusInvalid(); return; }
  if(this.isNewPassword && new TextEncoder().encode(this.password).length > 72) { this.focusInvalid(); return; }
  if(this.mode()==='reset' && !this.token) { this.feedback.show('Lien de réinitialisation manquant. Demandez un nouveau lien.','error'); return; }
  this.busy.set(true);
  if(this.mode()==='forgot') { this.auth.forgot(this.email).subscribe({next:r=>{this.busy.set(false);this.done.set(r.message);this.email='';},error:e=>{this.busy.set(false);this.feedback.error(e)}}); return; }
  if(this.mode()==='reset') { this.auth.reset(this.token,this.password).subscribe({next:r=>{this.busy.set(false);this.password='';this.confirmPassword='';this.token='';this.feedback.show(r.message);this.router.navigate(['/connexion']);},error:e=>{this.busy.set(false);this.feedback.error(e)}}); return; }
  const request=this.mode()==='register'?this.auth.register(this.matricule,this.email,this.password):this.auth.login(this.email,this.password);
  request.subscribe({next:()=>{this.busy.set(false);this.email='';this.password='';this.confirmPassword='';this.matricule='';this.router.navigate([this.auth.isManager()?'/admin/dashboard':'/espace/catalogue']);},error:e=>{this.busy.set(false);this.feedback.error(e)}});
 }
}
