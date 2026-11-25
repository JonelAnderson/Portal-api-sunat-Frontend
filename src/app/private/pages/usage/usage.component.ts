import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { TenantContextService } from '@shared/service/tenant-context.service';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { PortalEmptyComponent } from '@shared/components/reusables/portal-empty/portal-empty.component';
import { serverMessages } from '@shared/functions/list-helpers';
import { ymToDisplay } from '@shared/functions/lima-dates';
import { PortalDataService } from '../portal-data.service';
import { TenantUsage, isUnlimited, quotaPercent, quotaText, quotaTone } from '../portal.models';

/** Una barra del gráfico (alturas en % del mes con más comprobantes). */
interface MonthBar {
  month: string;
  /** "noviembre de 2026". */
  name: string;
  label: string;
  title: string;
  documents: number;
  height: number;
  current: boolean;
}

/**
 * Uso (`GET portal/tenants/{id}/uso`): comprobantes del mes contra el cupo del plan y el histórico del mes actual y los 5
 * anteriores, en un gráfico simple de barras con CSS (sin librerías) y la misma tabla de cifras debajo (para lectores de
 * pantalla). Un 404 es un estado vacío amable.
 */
@Component({
  selector: 'app-usage',
  imports: [NgClass, PageHeaderComponent, PortalEmptyComponent],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.scss'
})
export class UsageComponent {
  private data = inject(PortalDataService);
  readonly context = inject(TenantContextService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly usage = signal<TenantUsage | null>(null);
  private request = 0;

  readonly monthName = computed(() => ymToDisplay(this.usage()?.month));
  readonly unlimited = computed(() => isUnlimited(this.usage()?.maxDocuments));
  readonly quota = computed(() => quotaText(this.usage()?.documents, this.usage()?.maxDocuments));
  readonly percent = computed(() => quotaPercent(this.usage()?.documents, this.usage()?.maxDocuments));
  readonly tone = computed(() => quotaTone(this.percent()));
  readonly bars = computed<MonthBar[]>(() => {
    const u = this.usage();
    // Orden cronológico, aunque la API los mande al revés; el mes actual va aunque no esté en `history`.
    const list = [...(u?.history ?? [])].sort((a, b) => a.month.localeCompare(b.month));
    if (u && !list.some((h) => h.month === u.month)) {
      list.push({ month: u.month, documents: u.documents });
    }
    const max = Math.max(0, ...list.map((h) => h.documents ?? 0));
    return list.map((h) => ({
      month: h.month,
      name: ymToDisplay(h.month),
      label: monthShort(h.month),
      title: `${ymToDisplay(h.month)}: ${(h.documents ?? 0).toLocaleString('es-PE')} comprobantes`,
      documents: h.documents ?? 0,
      height: max > 0 ? Math.max(2, Math.round(((h.documents ?? 0) / max) * 100)) : 0,
      current: h.month === u?.month
    }));
  });

  constructor(title: CustomTitleService) {
    title.set('Uso del mes');
    effect(() => {
      const id = this.context.tenantId();
      untracked(() => this.load(id));
    });
  }

  load(id: number | null = this.context.tenantId()): void {
    const request = ++this.request;
    this.error.set('');
    this.notFound.set(false);
    this.usage.set(null);
    if (id == null) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.data.usage(id).subscribe({
      next: (resp) => {
        if (request !== this.request) {
          return;
        }
        this.loading.set(false);
        if (resp.succeeded && resp.data) {
          this.usage.set(resp.data as TenantUsage);
        } else {
          this.error.set(serverMessages(resp, 'No se pudo cargar el uso.'));
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
          this.error.set(serverMessages(err?.error, 'No se pudo cargar el uso.'));
        }
      }
    });
  }
}

/** "2026-11" → "nov" (el año va en el título de la barra). */
function monthShort(ym: string): string {
  const full = ymToDisplay(ym);
  return full ? full.split(' ')[0].substring(0, 3) : ym;
}
