// Angular Import
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

// project import
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private router = inject(Router);

  /**
   * Los enlaces de acción de la plantilla (menú, barra superior) son `<a href="#" (click)=…>`: sin esto el navegador seguiría el `#`
   * y cambiaría la ruta. No se usa `javascript:` en ningún enlace porque la CSP estricta lo bloquea.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (target?.closest?.('a[href="#"]')) {
      event.preventDefault();
    }
  }

  // life cycle event
  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }
}
