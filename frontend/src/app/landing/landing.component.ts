import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { LucideAngularModule, ArrowRight, ArrowUpRight, BookOpen, Search, FileText, ChevronDown, Menu, X, LockKeyhole, SlidersHorizontal } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
@Component({ selector:'app-landing', standalone:true, imports:[RouterLink,LucideAngularModule], templateUrl:'./landing.component.html', styleUrl:'./landing.component.scss' })
export class LandingComponent implements AfterViewInit, OnDestroy {
 readonly auth=inject(AuthService);
 get workspaceLink():string { return this.auth.isManager() ? '/admin/dashboard' : '/espace/catalogue'; }
 get catalogueLink():string { return this.auth.isManager() ? '/admin/documents' : '/espace/catalogue'; }
 readonly icons = { ArrowRight, ArrowUpRight, BookOpen, Search, FileText, ChevronDown, Menu, X, LockKeyhole, SlidersHorizontal };
 menuOpen=false;
 private animation?: gsap.Context;
 constructor(private element:ElementRef<HTMLElement>) {}
 @HostListener('document:keydown.escape') closeMenu():void { this.menuOpen=false; }
 ngAfterViewInit():void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  this.animation=gsap.context(()=>{
   gsap.to('.hero-photo img', { yPercent: 8, ease:'none', scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true} });
  },this.element.nativeElement);
 }
 ngOnDestroy():void { this.animation?.revert(); }
}
