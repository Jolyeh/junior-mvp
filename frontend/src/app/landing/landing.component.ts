import { AfterViewInit, Component, ElementRef, OnDestroy, output } from '@angular/core';
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
  readonly login = output<void>();
  readonly register = output<void>();
  readonly icons = { ArrowRight, ArrowUpRight, BookOpen, BookMarked, Check, FileText, Filter, GraduationCap, Library, LockKeyhole, Menu, Search, ShieldCheck, Sparkles, X };
  menuOpen = false;
  private animation?: gsap.Context;
  constructor(private element: ElementRef<HTMLElement>) {}
  ngAfterViewInit(): void {
    this.animation = gsap.context(() => {
      gsap.from('.hero-reveal', { opacity: 0, y: 24, stagger: 0.1, duration: 0.7, ease: 'power2.out' });
      gsap.utils.toArray<HTMLElement>('.scroll-reveal').forEach(el => {
        gsap.from(el, { opacity: 0, y: 24, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
    }, this.element.nativeElement);
  }
  ngOnDestroy(): void { this.animation?.revert(); }
}
