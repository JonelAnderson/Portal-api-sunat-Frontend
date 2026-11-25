import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Estado vacío amable de una pantalla del portal: sin empresas vinculadas, empresa que la API no reconoce (404) o un error de
 * carga. Solo presentación (`.erp-empty*` de `_components.scss`); el contenido extra (botón de reintentar) se proyecta.
 */
@Component({
  selector: 'app-portal-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="erp-empty" role="status">
      <span class="erp-empty__icon" aria-hidden="true"><em class="feather {{ icon() }}"></em></span>
      <h5 class="erp-empty__title">{{ title() }}</h5>
      @if (text()) {<p class="erp-empty__text mb-2">{{ text() }}</p>}
      <ng-content></ng-content>
    </div>
  `
})
export class PortalEmptyComponent {
  readonly icon = input('icon-inbox');
  readonly title = input.required<string>();
  readonly text = input('');
}
