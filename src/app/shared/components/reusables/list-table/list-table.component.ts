import { ChangeDetectorRef, Component, EventEmitter, AfterViewInit, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableColumns, TableFooter } from '@shared/models/list-table.interface';
import { getEsPaginatorIntl } from '@shared/paginator-intl/es-paginator-intl';
import { DefaultService } from '@shared/service/default.service';
import { SharedModule } from '../../../shared.module';
import { startWith, switchMap } from 'rxjs/operators';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { TableAction } from '@shared/models/table-action.interface';
import { AlertModalService } from '@shared/service/alert-modal.service';

@Component({
  selector: 'app-list-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatIconModule,
    MatPaginatorModule,
    FormsModule,
    SharedModule,
    NgxSpinnerModule
  ],
  templateUrl: './list-table.component.html',
  styleUrls: ['./list-table.component.scss'],
  providers: [
    {
      provide: MatPaginatorIntl,
      useValue: getEsPaginatorIntl()
    }
  ]
})
export class ListTableComponent<T> implements OnInit, AfterViewInit, OnChanges {
  @Input() service?: any;
  @Input() columns?: TableColumns<T>[];
  @Input() getInputs: any;
  @Input() numRecords?: number = 10;
  @Input() footer: TableFooter<T>[] = [];
  @Input() actions: TableAction[] = [];

  @Output() actionTriggered = new EventEmitter<{ action: string; row: T }>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  changesGetInputs = new EventEmitter<T>();
  dataSource = new MatTableDataSource<T>();
  visibleColumns?: Array<keyof T | string>;
  visibleFooter?: Array<keyof T | string | object>;

  // Cursor for Keyset Pagination (Supports int and string GUIDs)
  lastId?: number | string | null = null;

  paginatorOptions = {
    pageSizeOptions: [10, 20, 50], // la API SUNAT devuelve 50 filas por página como máximo (records 1–50)
    pageSize: 10,
    pageLength: 0
  };

  constructor(
    private _spinner: NgxSpinnerService,
    private alertModalService: AlertModalService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.setVisibleColumns();
    }
    if (changes['getInputs'] && this.paginator) {
      this.paginator.pageIndex = 0;
      this.lastId = null; // Reset cursor on filter change
      this.changesGetInputs.emit();
    }
  }

  setVisibleColumns() {
    this.visibleColumns = this.columns.filter((columns: any) => columns.visible).map((columns: any) => columns.property);
  }

  ngAfterViewInit(): void {
    if (this.service && this.isDefaultService(this.service)) {
      this.getDataByService();
      this.paginatorChanges();
    }
  }

  getDataByService() {
    this.changesGetInputs
      .pipe(
        startWith(''),
        switchMap(() => {
          if (this._spinner) this._spinner.show();
          return this.service.GetAll(this.paginator.pageSize, this.paginator.pageIndex, this.getInputs, this.lastId);
        })
      )
      .subscribe({
        next: (data: any) => {
          if (this._spinner) this._spinner.hide();
          this.setData(data);
        },
        error: () => {
          if (this._spinner) this._spinner.hide();
          this.dataSource.data = [];
          this.paginatorOptions.pageLength = 0;
          this._cdr.detectChanges();
        }
      });
  }

  setData(data: any) {
    const rows = Array.isArray(data?.data) ? data.data : [];
    const isEmptyList = rows.length === 0 && (data?.totalRecords ?? 0) === 0;
    if (data.succeeded || isEmptyList) {
      this.setVisibleColumns();
      
      // We use Promise.resolve().then() to wrap the data assignment in a microtask.
      // This solves the NG0100: ExpressionChangedAfterItHasBeenCheckedError
      // by ensuring the update happens after the current check cycle.
      Promise.resolve().then(() => {
        this.paginatorOptions.pageLength = data.totalRecords ?? 0;
        this.dataSource.data = rows;
        if (data.footer) this.setFooter(data.footer);
        this.dataSource._updateChangeSubscription();
        this._cdr.detectChanges();
      });

    } else {
      this.alertModalService.showNotification('Atención', data.messages || 'Error al cargar los datos', 'warning');
      this.dataSource.data = [];
      this.paginatorOptions.pageLength = 0;
      this._cdr.detectChanges();
    }
  }

  setFooter(data: any) {
    this.visibleFooter = [];
    if (this.footer.length && data) {
      this.footer.forEach((e) => {
        this.visibleFooter.push({
          label: e.label,
          value: data[e.property],
          tooltip: e.tooltip
        });
      });
    }
  }

  paginatorChanges() {
    this.paginator.page.subscribe((event) => {
      // Cursor (Last ID) only for "next page": a jump (last page button, page size change) must page by number,
      // otherwise the server returns the rows right after the current page instead of the requested one.
      if (event.pageIndex === (event.previousPageIndex ?? -1) + 1) {
        // Going to Next Page
        const data = this.dataSource.data;
        if (data && data.length > 0) {
           const lastItem: any = data[data.length - 1];
           this.lastId = lastItem.id; 
        }
      } else {
        // Going Previous or Reset - Fallback/Reset
         this.lastId = null;
      }
      this.changesGetInputs.emit();
    });
  }

  private isDefaultService(obj: any): obj is DefaultService {
    return 'GetAll' in obj;
  }

  handleAction(actionId: string, row: T): void {
    this.actionTriggered.emit({ action: actionId, row });
  }

  isActionVisible(action: TableAction, row: any): boolean {
    if (action.visible) {
      return action.visible(row);
    }
    if (action.showOnState) {
      return row[action.showOnState.field] === action.showOnState.value;
    }
    return true;
  }

  isActionDisabled(action: TableAction, row: any): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getActionLabel(action: TableAction, row: any): string {
    return typeof action.label === 'function' ? action.label(row) : action.label;
  }

  getActionIcon(action: TableAction, row: any): string {
    return typeof action.icon === 'function' ? action.icon(row) : action.icon;
  }

  getActionColor(action: TableAction, row: any): string {
    if (!action.color) return 'primary';
    return typeof action.color === 'function' ? action.color(row) : action.color;
  }

  getActionTooltip(action: TableAction, row: any): string {
    if (!action.tooltip) return action.label as string;
    return typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip;
  } // [matTooltip]="getActionTooltip(action, row)" para mostrar tooltip en botones de acción

  getData() {
    return this.dataSource.data;
  }

  /** Vuelve a pedir la página actual con los mismos filtros (después de una acción sobre una fila: no vuelve a la página 1). */
  reload(): void {
    this.changesGetInputs.emit();
  }

  formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    };
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', options);
  }

  /** Badge cells: booleans (e.g. isActive) must not go through the uppercase pipe. */
  formatBadgeText(row: Record<string, unknown>, property: string | keyof T): string {
    const value = row[property as string];
    if (typeof value === 'boolean') {
      return value ? 'ACTIVO' : 'INACTIVO';
    }
    if (value == null) {
      return '';
    }
    return String(value).toUpperCase();
  }
}
