import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { openModal, serverMessages } from '@shared/functions/list-helpers';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { DocFile, DocKind, Json, PDF_FORMATS, fileAvailable, kindInfo, obj } from './tenant-views.models';
import { PortalDataService } from '../portal-data.service';
import { DocView, buildDocView } from './tenant-doc.views';
import { ViewBlockComponent } from './view-block.component';

/**
 * Detalle de un comprobante de la empresa (`GET portal/tenants/{id}/{tipo}/{docId}`; en liquidaciones de compra además
 * `…/pagos`). Muestra el estado SUNAT guardado y descarga XML / CDR / PDF por las rutas del portal. Solo lectura: no hay
 * acciones sobre el comprobante. Un 404 (la API no reconoce el comprobante o la empresa) se explica sin alarma.
 */
@Component({
  selector: 'app-doc-detail',
  imports: [FormsModule, NgClass, ViewBlockComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather {{ icon }}"></em>Detalle del comprobante</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (loading()) {
      <div class="erp-loading" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span>Cargando…</div>
      } @else if (error()) {
      <div class="alert alert-warning mb-0">{{ error() }}</div>
      } @else if (view(); as v) {
      <div class="erp-doc">
        <div class="erp-doc__head">
          <div>
            <p class="erp-doc__type">{{ v.type }}</p>
            <h4 class="erp-doc__number">{{ v.number || '—' }}</h4>
            @if (v.status) {<span class="badge" [ngClass]="v.status.badge">{{ v.status.text || 'Sin estado' }}</span>}
          </div>
          @if (v.total?.value) {
          <div class="erp-doc__total-box">
            <span class="erp-doc__label">{{ v.total.label }}</span>
            <div class="erp-doc__total-amount">{{ v.total.value }}</div>
          </div>
          }
        </div>

        <div class="erp-doc__section">
          <h6 class="erp-doc__section-title"><em class="feather icon-download"></em>Archivos</h6>
          <div class="erp-doc__links align-items-center">
            <button type="button" class="btn btn-sm btn-outline-primary" [disabled]="!can('xml') || busy()" (click)="download('xml')">
              <em class="feather icon-code"></em>XML
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary" [disabled]="!can('cdr') || busy()" (click)="download('cdr')">
              <em class="feather icon-check-square"></em>CDR
            </button>
            @if (pdf) {
            <div class="input-group input-group-sm w-auto">
              <select class="form-select form-select-sm" aria-label="Formato del PDF" [(ngModel)]="pdfFormat">
                @for (f of formats; track f.id) {<option [value]="f.id">{{ f.name }}</option>}
              </select>
              <button type="button" class="btn btn-outline-primary" [disabled]="busy()" (click)="download('pdf')">
                <em class="feather icon-file me-1"></em>PDF
              </button>
            </div>
            }
            @if (busy()) {<span class="spinner-border spinner-border-sm text-primary" role="status" aria-label="Descargando"></span>}
          </div>
          @if (!can('xml') || !can('cdr')) {
          <p class="small text-muted mt-2 mb-0">Los botones deshabilitados indican que aún no existe ese archivo (comprobante sin firmar o sin respuesta de SUNAT).</p>
          }
        </div>

        <app-view-block [block]="v.block"></app-view-block>

        @if (v.totals.length) {
        <div class="erp-doc__totals">
          @for (t of v.totals; track $index) {
          <div [class.erp-doc__grand]="$last"><span>{{ t.label }}</span><span>{{ t.value }}</span></div>
          }
        </div>
        }
      </div>
      }
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
    </div>
  `
})
export class DocDetailComponent implements OnInit {
  readonly activeModal = inject(NgbActiveModal);
  private data = inject(PortalDataService);

  tenantId!: number;
  kind!: DocKind;
  docId!: number;
  /** Fila del listado (opcional): completa lo que el detalle no trae. */
  row: Json | null = null;

  readonly formats = PDF_FORMATS;
  pdfFormat = 'a4';
  icon = 'icon-file-text';
  pdf = true;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly view = signal<DocView | null>(null);
  private detail: Json = {};

  ngOnInit(): void {
    const info = kindInfo(this.kind);
    this.icon = info?.icon ?? 'icon-file-text';
    this.pdf = !!info?.pdf;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const detail$ = this.data.get(this.tenantId, `${this.kind}/${this.docId}`);
    const payments$ = this.kind === 'liquidaciones-compra'
      ? this.data.get(this.tenantId, `${this.kind}/${this.docId}/pagos`).pipe(catchError(() => of(null as BaseResponse | null)))
      : of(null as BaseResponse | null);
    forkJoin([detail$, payments$]).subscribe({
      next: ([detail, payments]) => {
        this.loading.set(false);
        if (detail.succeeded && detail.data) {
          this.detail = { ...(this.row ?? {}), ...obj(detail.data) };
          this.view.set(buildDocView(this.kind, obj(detail.data), this.row, payments?.succeeded ? obj(payments.data) : null));
        } else {
          this.error.set(serverMessages(detail, 'No se pudo cargar el comprobante.'));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.status === 404 ? 'No encontramos este comprobante.' : serverMessages(err?.error, 'No se pudo cargar el comprobante.'));
      }
    });
  }

  can(file: DocFile): boolean {
    return fileAvailable(this.kind, this.detail, file);
  }

  async download(file: DocFile): Promise<void> {
    this.busy.set(true);
    try {
      await this.data.download(this.tenantId, this.kind, this.docId, file, this.detail, this.pdfFormat);
    } finally {
      this.busy.set(false);
    }
  }
}

/** Abre el detalle de un comprobante de la empresa. */
export function openDocDetail(modal: NgbModal, tenantId: number, kind: DocKind, docId: number, row?: Json | null): void {
  openModal<boolean>(modal, DocDetailComponent, (ref) => Object.assign(ref.componentInstance, {
    tenantId, kind, docId, row: row ?? null
  }), () => undefined, 'xl');
}
