import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'cad-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent {
  constructor(private _router: Router, private location: Location) {}

  /** Volver a la pantalla anterior (sin `javascript:` en el enlace: la CSP lo bloquea). */
  back(): void {
    this.location.back();
  }

  goToPage(path: string): void {
    this._router.navigateByUrl(path);
  }
}
