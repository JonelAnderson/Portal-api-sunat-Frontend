// angular import
import { Component, inject } from '@angular/core';

// project import
import { SharedModule } from '@shared/shared.module';
import { tenantLabel } from '@shared/service/current-user-profile.service';
import { TenantContextService } from '@shared/service/tenant-context.service';

/**
 * Lado izquierdo de la barra superior: la empresa con la que se trabaja. Con una sola empresa se muestra su nombre; con varias
 * (`tenants` de `GET portal/auth/me`) un selector. La elegida vive en `TenantContextService` (solo su id, en sessionStorage).
 */
@Component({
  selector: 'app-nav-left',
  imports: [SharedModule],
  templateUrl: './nav-left.component.html',
  styleUrls: ['./nav-left.component.scss']
})
export class NavLeftComponent {
  readonly context = inject(TenantContextService);
  readonly label = tenantLabel;

  onSelect(event: Event): void {
    this.context.select(Number((event.target as HTMLSelectElement).value));
  }
}
