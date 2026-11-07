import { Component, effect, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-angular';
import { FeedbackService } from './feedback.service';
@Component({ selector:'app-root', standalone:true, imports:[RouterOutlet, LucideAngularModule], templateUrl:'./app.component.html', styleUrl:'./app.component.scss' })
export class AppComponent {
 feedback=inject(FeedbackService); icons={X,CheckCircle2,AlertCircle,AlertTriangle};
 private previousFocus: HTMLElement | null = null;
 constructor(){ effect(()=>{ const dialog=this.feedback.confirmation(); if(dialog){this.previousFocus=document.activeElement as HTMLElement;setTimeout(()=>document.querySelector<HTMLElement>('.confirm-dialog button')?.focus());}else if(this.previousFocus){this.previousFocus.focus();this.previousFocus=null;} }); }
 @HostListener('document:keydown', ['$event']) onKeydown(event: KeyboardEvent){
  if(!this.feedback.confirmation())return;
  if(event.key==='Escape'){event.preventDefault();this.feedback.confirmation.set(null);return;}
  if(event.key==='Tab'){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.confirm-dialog button'));if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}}
 }
}
