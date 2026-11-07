import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowRight, ArrowUpRight, BookOpen, Search, FileText, ChevronDown, Menu, X, LockKeyhole, SlidersHorizontal } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
@Component({ selector:'app-landing', standalone:true, imports:[RouterLink,LucideAngularModule], templateUrl:'./landing.component.html', styleUrl:'./landing.component.scss' })
export class LandingComponent implements AfterViewInit, OnDestroy {
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
