import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/auth.service';
import { routes } from './app/routes';
bootstrapApplication(AppComponent, { providers: [provideZoneChangeDetection(), provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes, withInMemoryScrolling({scrollPositionRestoration:'top',anchorScrolling:'enabled'}))] }).catch(console.error);
