import { ApplicationConfig, ErrorHandler, importProvidersFrom, provideAppInitializer } from '@angular/core';
import { removeLegacyStorageKeys } from '@shared/functions/legacy-storage-cleanup';
import { provideRouter } from '@angular/router';
import { DatePipe, LocationStrategy, PathLocationStrategy } from '@angular/common';

import { provideHttpClient, withInterceptors, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { provideToastr, ToastrModule } from 'ngx-toastr';
import { InactivityService } from '@shared/service/inactivity.service';
import { AuthInterceptor } from '@shared/interceptors/auth.interceptor';

import { GlobalErrorHandler } from '@shared/service/global-error-handler.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { provideScrollbarPolyfill } from 'ngx-scrollbar';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { routes } from './app.routes';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { CustomTranslateLoader } from '@shared/custom-translate-loader';


export const appConfig: ApplicationConfig = {

  providers: [
    importProvidersFrom(BrowserModule,NgxSpinnerModule,ToastrModule.forRoot()),
    
    provideHttpClient(withInterceptors([AuthInterceptor])), 
    provideRouter(routes), 
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
      closeButton: true,
      progressBar: true,
      preventDuplicates: true,
    }),
    // ngx-scrollbar carga su polyfill desde jsdelivr si el navegador no tiene ScrollTimeline (Firefox, Safari): la CSP lo bloquea.
    // Se sirve el mismo archivo desde los assets propios (angular.json lo copia de node_modules/ngx-scrollbar/assets).
    provideScrollbarPolyfill('/assets/scroll-timeline-polyfill.js'),
    InactivityService, 
    AlertModalService,
    DatePipe,
    { provide: LocationStrategy, useClass: PathLocationStrategy }, 
    { provide: ErrorHandler, useClass: GlobalErrorHandler},
    // Borra de localStorage lo que nunca debe estar ahí (permisos, menú, foto): solo van los tokens.
    provideAppInitializer(removeLegacyStorageKeys),
    provideHttpClient(withInterceptorsFromDi()),
     provideAnimations(),
    provideTranslateService({
      loader: { provide: TranslateLoader, useClass: CustomTranslateLoader },
      lang: 'es',
      fallbackLang: 'en'
    }),

  ]

};
