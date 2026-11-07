import { Injectable, signal } from '@angular/core';
@Injectable({providedIn:'root'})
export class FeedbackService {
 notice = signal<{kind:'success'|'error'|'info'; message:string}|null>(null);
 confirmation = signal<{ title:string; text:string; action:()=>void }|null>(null);
 confirmationTrigger: HTMLElement | null = null;
 private timer?: ReturnType<typeof setTimeout>;
 show(message:string, kind:'success'|'error'|'info'='success') { clearTimeout(this.timer); this.notice.set({message,kind}); if(kind!=='error') this.timer=setTimeout(()=>this.notice.set(null), 6500); }
 error(error:any) {
  const messages = error?.error?.message;
  let message = Array.isArray(messages) ? messages.join(' ') : typeof messages === 'string' ? messages : '';
  if (error?.status === 0) message = 'Impossible de joindre le serveur. Vérifiez que l’API est démarrée et que son adresse est correcte.';
  else if (error?.status === 413) message = 'Le fichier est trop volumineux. Respectez la taille maximale indiquée.';
  else if (error?.status === 429) message = 'Trop de tentatives. Patientez une minute avant de réessayer.';
  else if (!message || message === 'Internal server error') message = 'Une erreur est survenue. Réessayez ou contactez votre établissement.';
  this.show(message, 'error'); return message;
 }
 confirm(title:string,text:string,action:()=>void) { this.confirmationTrigger=document.activeElement instanceof HTMLElement ? document.activeElement : null; this.confirmation.set({title,text,action}); }
 accept() { const item=this.confirmation(); this.confirmation.set(null); item?.action(); }
}
