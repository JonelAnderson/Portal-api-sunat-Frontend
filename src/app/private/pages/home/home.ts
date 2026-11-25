import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { TenantContextService } from '@shared/service/tenant-context.service';
import { tenantLabel } from '@shared/service/current-user-profile.service';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { PortalEmptyComponent } from '@shared/components/reusables/portal-empty/portal-empty.component';
import { serverMessages } from '@shared/functions/list-helpers';
import { isoToLima, ymdToDisplay } from '@shared/functions/lima-dates';
import { PortalDataService } from '../portal-data.service';
import { TenantSummary, certificateView, isUnlimited, quotaPercent, quotaText, quotaTone } from '../portal.models';

const ENVIRONMENTS: Record<string, string> = { beta: 'Pruebas (beta)', production: 'Producción' };

interface Shortcut {
  label: string;
  description: string;
  icon: string;
  url: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Comprobantes', description: 'Facturas, boletas, notas y guías con su PDF, XML y CDR', icon: 'icon-file-text', url: '/private/documents' },
  { label: 'Uso del mes', description: 'Comprobantes emitidos y el cupo de su plan', icon: 'icon-bar-chart-2', url: '/private/usage' },
  { label: 'Credenciales de la API', description: 'Regenerar la clave y el secreto de la API', icon: 'icon-key', url: '/private/credentials' }
];

/**
 * Inicio: resumen de la empresa elegida (`GET portal/tenants/{id}/resumen`): plan, barra del cupo del mes, estado del
 * certificado (con aviso si vence o venció) y aviso si la emisión está suspendida por falta de pago. Un 404 (la API no
 * reconoce la empresa) se muestra como estado vacío amable, no como error.
 */
@Component({
  selector: 'app-home',
  imports: [NgClass, RouterLink, PageHeaderComponent, PortalEmptyComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  private data = inject(PortalDataService);
  readonly context = inject(TenantContextService);

  readonly shortcuts = SHORTCUTS;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly summary = signal<TenantSummary | null>(null);
  private request = 0;

  readonly label = tenantLabel;
  readonly environment = computed(() => {
    const e = this.summary()?.environment ?? '';
    return ENVIRONMENTS[e] ?? e;
  });
  readonly unlimited = computed(() => isUnlimited(this.summary()?.maxDocumentsMonth));
  readonly quota = computed(() => quotaText(this.summary()?.documentsThisMonth, this.summary()?.maxDocumentsMonth));
  readonly percent = computed(() => quotaPercent(this.summary()?.documentsThisMonth, this.summary()?.maxDocumentsMonth));
  readonly tone = computed(() => quotaTone(this.percent()));
  readonly certificate = computed(() => certificateView(this.summary()?.certificate));
  readonly certificateExpires = computed(() => ymdToDisplay(this.summary()?.certificate?.expiresOn));
  readonly daysLeft = computed(() => this.summary()?.certificate?.daysLeft ?? null);

  constructor(title: CustomTitleService) {
    title.set('Inicio');
    effect(() => {
      const id = this.context.tenantId();
      untracked(() => this.load(id));
    });
  }

  load(id: number | null = this.context.tenantId()): void {
    const request = ++this.request;
    this.error.set('');
    this.notFound.set(false);
    this.summary.set(null);
    if (id == null) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.data.summary(id).subscribe({
      next: (resp) => {
        if (request !== this.request) {
          return;
        }
        this.loading.set(false);
        if (resp.succeeded && resp.data) {
          this.summary.set(resp.data as TenantSummary);
        } else {
          this.error.set(serverMessages(resp, 'No se pudo cargar el resumen de la empresa.'));
        }
      },
      error: (err: HttpErrorResponse) => {
        if (request !== this.request) {
          return;
        }
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(serverMessages(err?.error, 'No se pudo cargar el resumen de la empresa.'));
        }
      }
    });
  }

  /** Cuándo venció o vence el certificado, en palabras. */
  certificateWhen(): string {
    const days = this.daysLeft();
    if (days == null) {
      return '';
    }
    return days < 0 ? `Venció hace ${-days} ${-days === 1 ? 'día' : 'días'}`
      : days === 0 ? 'Vence hoy' : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  /** Instante ISO → hora de Lima (para quien la necesite en la plantilla). */
  lima(value?: string | null): string {
    return isoToLima(value);
  }
}
