import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

/**
 * Cabecera de página del ERP (fondo celeste suave, título celeste oscuro, ícono naranja).
 * Solo presentación: los filtros y las acciones se proyectan desde la pantalla.
 *
 * ```html
 * <div class="card">
 *   <app-page-header icon="icon-package" title="GESTIÓN DE PRODUCTOS" subtitle="Catálogo de la empresa"
 *     help="Texto de ayuda opcional">
 *     <app-filter-by-state headerFilters …></app-filter-by-state>
 *     <app-search-box-multiple headerFilters …></app-search-box-multiple>
 *     <app-button-reset-filters headerActions …></app-button-reset-filters>
 *     <button headerActions type="button" class="btn btn-primary">…</button>
 *   </app-page-header>
 * ```
 * Cada elemento proyectado lleva el atributo `headerFilters` o `headerActions` (así queda como hijo
 * directo del contenedor flexible). Para agrupar sin envoltorio: `<ng-container ngProjectAs="[headerActions]">`.
 * ```html
 *   <div class="card-body">…</div>
 * </div>
 * ```
 * Fuera de una tarjeta, usar `[standalone]="true"` (borde y radio propios).
 * Estilos globales: `.erp-page-header*` en `src/scss/erp/_components.scss`.
 */
@Component({
  selector: 'app-page-header',
  imports: [NgbTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `title` es un input, pero el atributo estático queda en el elemento y el navegador muestra su tooltip nativo encima del
  // de ayuda: se quita del host.
  host: { class: 'd-block', '[attr.title]': 'null' },
  template: `
    <header class="erp-page-header" [class.erp-page-header--standalone]="standalone()">
      <div class="erp-page-header__main">
        @if (iconClass()) {
        <span class="erp-page-header__icon" aria-hidden="true"><em class="feather {{ iconClass() }}"></em></span>
        }
        <div class="erp-page-header__text">
          <h2 class="erp-page-header__title">
            <span>{{ title() }}</span>
            @if (help()) {
            <button type="button" class="erp-page-header__help feather icon-help-circle" [ngbTooltip]="help()"
              container="body" placement="bottom" [attr.aria-label]="'Ayuda: ' + help()"></button>
            }
            <ng-content select="[headerMeta]"></ng-content>
          </h2>
          @if (subtitle()) {
          <p class="erp-page-header__subtitle">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="erp-page-header__tools">
        <div class="erp-page-header__filters"><ng-content select="[headerFilters]"></ng-content></div>
        <div class="erp-page-header__actions"><ng-content select="[headerActions]"></ng-content></div>
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  /** Clase feather del ícono, con o sin el prefijo `icon-` (ej. `icon-package` o `package`). */
  readonly icon = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string | null | undefined>(null);
  /** Texto de ayuda (tooltip junto al título). */
  readonly help = input<string | null | undefined>(null);
  /** true = cabecera suelta (fuera de .card), con borde y radio propios. */
  readonly standalone = input(false);

  readonly iconClass = computed(() => {
    const i = (this.icon() ?? '').trim();
    if (!i) return '';
    return i.startsWith('icon-') ? i : `icon-${i}`;
  });
}
