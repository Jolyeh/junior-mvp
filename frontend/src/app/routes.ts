import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { AuthService } from './auth.service';
import { LandingComponent } from './landing/landing.component';
import { AuthPageComponent } from './auth-page.component';
import { LegalPageComponent } from './legal-page.component';
import { WorkspaceComponent } from './workspace/workspace.component';
const authenticated: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.user() ? true : router.createUrlTree(['/connexion']); };
const manager: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.isManager() ? true : router.createUrlTree(['/espace/catalogue']); };
const student: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return !auth.isManager() ? true : router.createUrlTree(['/admin/dashboard']); };
const adminRoute = (segments: UrlSegment[]): UrlMatchResult | null => {
 if (segments[0]?.path !== 'admin' || segments.length < 2 || segments.length > 4) return null;
 return {consumed:segments, posParams:{section:segments[1], ...(segments[2]?{action:segments[2]}:{}), ...(segments[3]?{id:segments[3]}:{})}};
};
export const routes: Routes = [
 {path:'',component:LandingComponent,title:'ESM BÉNIN | Bibliothèque universitaire'},
 {path:'mentions-legales',component:LegalPageComponent,title:'Mentions légales | ESM BÉNIN'},
 {path:'confidentialite',component:LegalPageComponent,data:{privacy:true},title:'Confidentialité | ESM BÉNIN'},
 {path:'connexion',component:AuthPageComponent,data:{mode:'login'},title:'Connexion | ESM BÉNIN'}, {path:'inscription',component:AuthPageComponent,data:{mode:'register'},title:'Inscription | ESM BÉNIN'}, {path:'mot-de-passe-oublie',component:AuthPageComponent,data:{mode:'forgot'},title:'Mot de passe oublié | ESM BÉNIN'}, {path:'reset-password',component:AuthPageComponent,data:{mode:'reset'},title:'Réinitialisation | ESM BÉNIN'},
 {path:'espace/:section',component:WorkspaceComponent,canActivate:[authenticated,student],data:{workspace:'student'}},
 {matcher:adminRoute,component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'**',redirectTo:''}
];
