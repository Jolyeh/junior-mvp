import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, ArrowUpRight, BookOpen, BookMarked, Check, FileText, Filter, GraduationCap, Library, LockKeyhole, Menu, Search, ShieldCheck, Sparkles, X } from 'lucide-angular';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly icons = { ArrowRight, ArrowUpRight, BookOpen, BookMarked, Check, FileText, Filter, GraduationCap, Library, LockKeyhole, Menu, Search, ShieldCheck, Sparkles, X };
  menuOpen = false;
  private animation?: gsap.Context;
  constructor(private element: ElementRef<HTMLElement>, private router: Router) {}
  goLogin(): void { this.router.navigate(['/connexion']); }
  goRegister(): void { this.router.navigate(['/inscription']); }
  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.animation = gsap.context(() => {
      gsap.from('.hero-reveal', { opacity: 0, y: 24, stagger: 0.1, duration: 0.7, ease: 'power2.out' });
      gsap.to('.image-photo', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.utils.toArray<HTMLElement>('.scroll-reveal').forEach(el => {
        gsap.from(el, { opacity: 0, y: 24, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
    }, this.element.nativeElement);
  }
  ngOnDestroy(): void { this.animation?.revert(); }
}
