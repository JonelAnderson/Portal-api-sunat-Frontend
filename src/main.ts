// Angular Import
import { enableProdMode } from '@angular/core';
import {  bootstrapApplication } from '@angular/platform-browser';

// project import
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';


// third party
import { appConfig } from './app/app-config';



if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent,appConfig).catch((err) => console.error(err));