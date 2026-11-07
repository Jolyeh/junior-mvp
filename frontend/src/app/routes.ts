import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './auth.service';
import { LandingComponent } from './landing/landing.component';
import { AuthPageComponent } from './auth-page.component';
import { WorkspaceComponent } from './workspace/workspace.component';
const authenticated: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.user() ? true : router.createUrlTree(['/connexion']); };
const manager: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return auth.isManager() ? true : router.createUrlTree(['/espace/catalogue']); };
const student: CanActivateFn = () => { const auth=inject(AuthService), router=inject(Router); return !auth.isManager() ? true : router.createUrlTree(['/admin/dashboard']); };
export const routes: Routes = [
 {path:'',component:LandingComponent},
 {path:'connexion',component:AuthPageComponent,data:{mode:'login'}}, {path:'inscription',component:AuthPageComponent,data:{mode:'register'}}, {path:'mot-de-passe-oublie',component:AuthPageComponent,data:{mode:'forgot'}}, {path:'reset-password',component:AuthPageComponent,data:{mode:'reset'}},
 {path:'espace/:section',component:WorkspaceComponent,canActivate:[authenticated,student],data:{workspace:'student'}},
 {path:'admin/:section',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'admin/:section/:action',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'admin/:section/:action/:id',component:WorkspaceComponent,canActivate:[authenticated,manager],data:{workspace:'admin'}},
 {path:'**',redirectTo:''}
];
