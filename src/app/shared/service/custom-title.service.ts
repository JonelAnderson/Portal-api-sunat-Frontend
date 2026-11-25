import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from './../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomTitleService {

    prefix = environment.production ? '' : 'DEV:: '
    year: number = new Date().getFullYear();

    constructor(private titleService: Title ) { 
    }

    set(title) {
        this.titleService.setTitle(`${this.prefix}${title} - DS® ${this.year}`)
    }

}