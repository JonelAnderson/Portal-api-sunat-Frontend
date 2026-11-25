import { Component, OnInit, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { PortalEmptyComponent } from '@shared/components/reusables/portal-empty/portal-empty.component';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { TenantContextService } from '@shared/service/tenant-context.service';
import { actionsCol, query } from '@shared/functions/list-helpers';
import {
  DocFile, DocKind, Json, KindInfo, OTHER_KINDS, SALE_KINDS, SUNAT_STATUS_OPTIONS, fileAvailable, kindInfo
} from './tenant-views.models';
import { ListSource, PortalDataService } from '../portal-data.service';
import { decorateRow, listColumns, rowId } from './tenant-doc.views';
import { openDocDetail } from './doc-detail.component';

/** Filtros de `GET portal/tenants/{id}/{tipo}` (los mismos nombres de `/api/v1`, contrato §5). */
interface DocFilters {
  fecha_desde: string;
  fecha_hasta: string;
  sunat_status: string | null;
  serie: string;
  textFilter: string;
}

const EMPTY: DocFilters = { fecha_desde: '', fecha_hasta: '', sunat_status: null, serie: '', textFilter: '' };

/**
 * Tipos que ofrece el portal: los comprobantes de venta y las guías, retenciones, percepciones y liquidaciones. Resúmenes
 * diarios y comunicaciones de baja son trámites internos con SUNAT y no se ofrecen (el contrato del portal no trae su
 * constancia de anulación).
 */
const KINDS: KindInfo<DocKind>[] = [
  ...SALE_KINDS,
  ...OTHER_KINDS.filter((k) => k.id !== 'resumenes' && k.id !== 'anulaciones')
];

/** Tipos cuyo filtro por fechas necesita las dos fechas (desde y hasta), como en `/api/v1`. */
const BOTH_DATES: DocKind[] = ['notas-credito', 'notas-debito', 'guias-remision', 'retenciones', 'percepciones'];

/** Los que aceptan búsqueda por texto (razón social, documento, serie o correlativo). */
const TEXT_SEARCH: DocKind[] = ['facturas', 'boletas'];

/**
 * Comprobantes de la empresa elegida: lista por tipo con filtros de fecha / estado / serie / texto, detalle en modal y
 * descargas de PDF, XML y CDR. Solo lectura: el portal no emite, anula ni corrige. La empresa sale de `TenantContextService`.
 */
@Component({
  selector: 'app-documents',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, PortalEmptyComponent],
  template: `
    <div class="row btn-page">
      <div class="col-12">
        <div class="card">
          <app-page-header icon="icon-file-text" title="COMPROBANTES" subtitle="Lo que su empresa emitió por la API, con su PDF, XML y CDR"></app-page-header>
          <div class="card-body">
            @if (!context.tenant()) {
            <app-portal-empty icon="icon-briefcase" title="Su cuenta aún no tiene empresas vinculadas"
              text="Pida a su proveedor que vincule su acceso a una empresa emisora."></app-portal-empty>
            } @else {
            <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Tipo de comprobante">
              @for (k of kinds; track k.id) {
              <button type="button" class="btn btn-sm" [class.btn-primary]="kind() === k.id" [class.btn-outline-primary]="kind() !== k.id"
                [attr.aria-pressed]="kind() === k.id" (click)="setKind(k.id)">
                <em class="feather {{ k.icon }} me-1"></em>{{ k.name }}
              </button>
              }
            </div>

            <form class="erp-form border rounded p-3 mb-3" (ngSubmit)="search()" novalidate>
              <div class="row g-2">
                <div class="col-6 col-md-3 col-xl-2">
                  <label class="form-label small" for="doc-desde">Emisión desde</label>
                  <input id="doc-desde" type="date" class="form-control form-control-sm" name="fecha_desde" [(ngModel)]="f.fecha_desde" />
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                  <label class="form-label small" for="doc-hasta">Emisión hasta</label>
                  <input id="doc-hasta" type="date" class="form-control form-control-sm" name="fecha_hasta" [(ngModel)]="f.fecha_hasta" />
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                  <label class="form-label small" for="doc-sunat">Estado SUNAT</label>
                  <select id="doc-sunat" class="form-select form-select-sm" name="sunat_status" [(ngModel)]="f.sunat_status">
                    <option [ngValue]="null">Todos</option>
                    @for (o of sunatStates; track o.id) {<option [ngValue]="o.id">{{ o.name }}</option>}
                  </select>
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                  <label class="form-label small" for="doc-serie">Serie</label>
                  <input id="doc-serie" type="text" class="form-control form-control-sm" name="serie" [(ngModel)]="f.serie" placeholder="F001" maxlength="10" />
                </div>
                @if (hasText()) {
                <div class="col-12 col-md-6 col-xl-4">
                  <label class="form-label small" for="doc-text">Búsqueda</label>
                  <input id="doc-text" type="search" class="form-control form-control-sm" name="textFilter" [(ngModel)]="f.textFilter"
                    placeholder="Cliente, documento, serie o correlativo" maxlength="100" />
                </div>
                }
              </div>
              <div class="d-flex flex-wrap gap-2 mt-3">
                <button type="submit" class="btn btn-sm btn-primary"><em class="feather icon-search me-1"></em>Buscar</button>
                <button type="button" class="btn btn-sm btn-light" (click)="clear()"><em class="feather icon-x me-1"></em>Limpiar</button>
                @if (bothDates()) {<span class="small text-muted align-self-center">El filtro por fecha necesita las dos fechas (desde y hasta).</span>}
              </div>
            </form>

            @for (k of [kind()]; track k) {
            <app-list-table [service]="source" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
            }
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DocumentsComponent implements OnInit {
  private data = inject(PortalDataService);
  private modal = inject(NgbModal);
  private alerts = inject(AlertModalService);
  readonly context = inject(TenantContextService);

  readonly kinds = KINDS;
  readonly sunatStates = SUNAT_STATUS_OPTIONS.filter((o) => ['pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado'].includes(o.id));
  readonly kind = signal<DocKind>('facturas');
  readonly getInputs = signal('');

  f: DocFilters = { ...EMPTY };
  source!: ListSource;
  columns: TableColumns<Json>[] = [];
  readonly actions: TableAction[] = [
    { id: 'detail', label: 'Ver detalle', icon: 'visibility', color: 'primary', tooltip: 'Datos, ítems, totales y estado SUNAT' },
    { id: 'xml', label: 'Descargar XML', icon: 'code', color: 'primary', visible: (r: Json) => fileAvailable(this.kind(), r, 'xml') },
    { id: 'cdr', label: 'Descargar CDR', icon: 'verified', color: 'primary', visible: (r: Json) => fileAvailable(this.kind(), r, 'cdr') },
    { id: 'pdf', label: 'Descargar PDF (A4)', icon: 'picture_as_pdf', color: 'primary', visible: () => kindInfo(this.kind()).pdf, tooltip: 'Otros formatos en el detalle' }
  ];
  private readonly list = viewChild(ListTableComponent);

  constructor(title: CustomTitleService) {
    title.set('Comprobantes');
    // Al cambiar de empresa se vuelve a pedir la lista (la fuente lee la empresa en cada pedido) y se limpian los filtros.
    effect(() => {
      this.context.tenantId();
      untracked(() => {
        this.f = { ...EMPTY };
        this.refresh();
      });
    });
  }

  ngOnInit(): void {
    this.source = this.data.listSource(() => this.context.tenantId(), () => this.kind(), (row) => decorateRow(this.kind())(row));
    this.columns = [...listColumns(this.kind()), actionsCol<Json>()];
  }

  hasText(): boolean {
    return TEXT_SEARCH.includes(this.kind());
  }

  bothDates(): boolean {
    return BOTH_DATES.includes(this.kind());
  }

  setKind(kind: DocKind): void {
    if (kind === this.kind()) {
      return;
    }
    this.kind.set(kind);
    this.f = { ...EMPTY };
    this.columns = [...listColumns(kind), actionsCol<Json>()];
    this.refresh();
  }

  clear(): void {
    this.f = { ...EMPTY };
    this.refresh();
  }

  async search(): Promise<void> {
    if (this.bothDates() && !!this.f.fecha_desde !== !!this.f.fecha_hasta) {
      await this.alerts.showNotification('Atención', 'El filtro por fecha necesita las dos fechas (desde y hasta).', 'warning');
      return;
    }
    if (this.f.fecha_desde && this.f.fecha_hasta && this.f.fecha_desde > this.f.fecha_hasta) {
      await this.alerts.showNotification('Atención', 'La fecha "desde" no puede ser posterior a la fecha "hasta".', 'warning');
      return;
    }
    this.refresh();
  }

  refresh(): void {
    const f = this.f;
    const values: Record<string, string | number | null> = {
      sunat_status: f.sunat_status, fecha_desde: f.fecha_desde, fecha_hasta: f.fecha_hasta, serie: f.serie.trim()
    };
    if (this.hasText()) {
      values['textFilter'] = f.textFilter.trim();
    }
    this.getInputs.set(query({ ...values, refresh: Math.random() }));
  }

  onAction(event: { action: string; row: Json }): void {
    const tenantId = this.context.tenantId();
    const id = rowId(event.row);
    if (tenantId == null || id == null) {
      return;
    }
    if (event.action === 'detail') {
      openDocDetail(this.modal, tenantId, this.kind(), id, event.row);
      return;
    }
    void this.data.download(tenantId, this.kind(), id, event.action as DocFile, event.row);
  }
}
