import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './auth.service';
import { LandingComponent } from './landing/landing.component';
import { AuthPageComponent } from './auth-page.component';
import { LegalPageComponent } from './legal-page.component';
import { WorkspaceComponent } from './workspace/workspace.component';
const authenticated: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.user() ? true : router.createUrlTree(['/connexion']); };
const manager: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.isManager() ? true : router.createUrlTree(['/espace/catalogue']); };
const student: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return !auth.isManager() ? true : router.createUrlTree(['/admin/dashboard']); };
export const routes: Routes = [
 {path:'',component:LandingComponent,title:'ESM BÉNIN | Bibliothèque universitaire'},
 {path:'mentions-legales',component:LegalPageComponent,title:'Mentions légales | ESM BÉNIN'},
 {path:'confidentialite',component:LegalPageComponent,data:{privacy:true},title:'Confidentialité | ESM BÉNIN'},
 {path:'connexion',component:AuthPageComponent,data:{mode:'login'},title:'Connexion | ESM BÉNIN'}, {path:'inscription',component:AuthPageComponent,data:{mode:'register'},title:'Inscription | ESM BÉNIN'}, {path:'mot-de-passe-oublie',component:AuthPageComponent,data:{mode:'forgot'},title:'Mot de passe oublié | ESM BÉNIN'}, {path:'reset-password',component:AuthPageComponent,data:{mode:'reset'},title:'Réinitialisation | ESM BÉNIN'},
 {path:'espace/:section',component:WorkspaceComponent,canActivate:[authenticated,student],data:{workspace:'student'}},
 {path:'admin/:section',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'admin/:section/:action',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'admin/:section/:action/:id',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'**',redirectTo:''}
];
