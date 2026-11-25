import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { DocKind, ViewBlock, ViewRow } from './tenant-views.models';

/**
 * Muestra un bloque de solo lectura armado en TS (tarjetas, grupos de datos, tablas y notas). Lo usan el panel, la
 * configuración, los reportes y el detalle de documentos de la página de la empresa. Las barras de las tablas son un gráfico
 * simple con CSS (el proyecto no tiene componente de gráficos propio).
 */
@Component({
  selector: 'app-view-block',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (block(); as b) {
    @if (b.stats?.length) {
    <div class="row g-2 mb-3">
      @for (s of b.stats; track $index) {
      <div class="col-6 col-md-4 col-xxl-3">
        <div class="border rounded p-2 h-100">
          <div class="small text-muted">{{ s.label }}</div>
          <div class="fs-5 fw-semibold erp-num" [ngClass]="'text-' + (s.tone === 'muted' ? 'secondary' : (s.tone || 'primary'))">{{ s.value || '0' }}</div>
          @if (s.hint) {<div class="small text-muted">{{ s.hint }}</div>}
        </div>
      </div>
      }
    </div>
    }
    @for (g of b.groups ?? []; track $index) {
    <div class="erp-doc__section">
      @if (g.title) {<h6 class="erp-doc__section-title"><em class="feather {{ g.icon || 'icon-info' }}"></em>{{ g.title }}</h6>}
      @if (g.items.length) {
      <div class="erp-doc__grid mb-0">
        @for (i of g.items; track $index) {
        <div>
          <span class="erp-doc__label">{{ i.label }}</span>
          @if (i.badge) {
          <span class="badge" [ngClass]="i.badge">{{ i.value }}</span>
          } @else {
          <span class="erp-doc__value">{{ i.value || '—' }}</span>
          }
        </div>
        }
      </div>
      } @else {
      <p class="small text-muted mb-0">Sin datos.</p>
      }
    </div>
    }
    @for (t of b.tables ?? []; track $index) {
    <div class="erp-doc__section">
      @if (t.title) {<h6 class="erp-doc__section-title"><em class="feather {{ t.icon || 'icon-list' }}"></em>{{ t.title }}</h6>}
      @if (t.rows.length) {
      <div class="erp-doc__lines">
        <table class="table table-sm table-hover align-middle small">
          <thead>
            <tr>
              @for (col of t.columns; track col.key) {
              <th scope="col" [class.text-end]="col.align === 'end'" [class.text-center]="col.align === 'center'">{{ col.label }}</th>
              }
              @if (hasRefs(t.rows)) {<th scope="col" class="text-center"><span class="visually-hidden">Abrir</span></th>}
              @if (hasActions(t.rows)) {<th scope="col" class="text-end">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            @for (r of t.rows; track $index) {
            <tr>
              @for (col of t.columns; track col.key) {
              <td [class.text-end]="col.align === 'end'" [class.text-center]="col.align === 'center'" [class.erp-num]="col.align === 'end'">
                @if (col.badge && r.cells[col.key]) {
                <span class="badge" [ngClass]="r.badges?.[col.key] || 'badge-light-secondary'">{{ r.cells[col.key] }}</span>
                } @else {
                {{ r.cells[col.key] }}
                }
                @if (r.bars?.[col.key] !== undefined) {
                <div class="progress mt-1" style="height: 4px" role="presentation"><div class="progress-bar" [style.width.%]="r.bars[col.key]"></div></div>
                }
              </td>
              }
              @if (hasRefs(t.rows)) {
              <td class="text-center">
                @if (r.ref) {
                <button type="button" class="btn btn-sm btn-link p-0" (click)="open.emit(r.ref)" aria-label="Ver detalle">
                  <em class="feather icon-eye"></em>
                </button>
                }
              </td>
              }
              @if (hasActions(t.rows)) {
              <td class="text-end text-nowrap">
                @for (a of r.actions ?? []; track a.id) {
                <button type="button" class="btn btn-sm btn-link px-1" [class.text-danger]="a.danger" [title]="a.label" [attr.aria-label]="a.label"
                  (click)="rowAction.emit({ action: a.id, row: r })"><em class="feather {{ a.icon }}"></em></button>
                }
              </td>
              }
            </tr>
            }
          </tbody>
          @if (t.total) {
          <tfoot>
            <tr class="fw-semibold">
              @for (col of t.columns; track col.key) {
              <td [class.text-end]="col.align === 'end'" [class.erp-num]="col.align === 'end'">{{ t.total.cells[col.key] }}</td>
              }
              @if (hasRefs(t.rows)) {<td></td>}
              @if (hasActions(t.rows)) {<td></td>}
            </tr>
          </tfoot>
          }
        </table>
      </div>
      } @else {
      <p class="small text-muted mb-0">{{ t.empty || 'Sin datos.' }}</p>
      }
    </div>
    }
    @for (n of b.notes ?? []; track $index) {
    <div class="erp-callout mb-2"><em class="feather icon-info"></em><span>{{ n }}</span></div>
    }
    }
  `
})
export class ViewBlockComponent {
  readonly block = input<ViewBlock | null>(null);
  /** Fila con `ref` (documento): abre su detalle. */
  readonly open = output<{ kind: DocKind; id: number }>();
  /** Acción de una fila (`row.actions`). */
  readonly rowAction = output<{ action: string; row: ViewRow }>();

  hasRefs(rows: { ref?: unknown }[]): boolean {
    return rows.some((r) => !!r.ref);
  }

  hasActions(rows: ViewRow[]): boolean {
    return rows.some((r) => !!r.actions?.length);
  }
}
