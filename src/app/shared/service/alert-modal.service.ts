import { Injectable, ComponentRef, createComponent, ApplicationRef, EnvironmentInjector, Type } from '@angular/core';
import { AlertComponent } from '@shared/components/reusables/alert/alert.component';
import { Subject } from 'rxjs';

export type AlertType = 'success' | 'warning' | 'danger' | 'info';
export interface AlertConfig {
  title: string;
  message: string;
  type: AlertType;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
}
@Injectable({
  providedIn: 'root'
})
export class AlertModalService {

  private componentRef!: ComponentRef<AlertComponent>;
  private alertResult = new Subject<boolean>();

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  show(config: AlertConfig): Promise<boolean> {
    // Crear el elemento contenedor
    const containerDiv = document.createElement('div');
    containerDiv.className = 'custom-alert-container';
    document.body.appendChild(containerDiv);

    // Crear el componente
    this.componentRef = createComponent(AlertComponent, {
      environmentInjector: this.injector,
      hostElement: containerDiv
    });

    // Configurar el componente
    const instance = this.componentRef.instance;
    instance.title = config.title;
    instance.message = config.message;
    instance.type = config.type;
    instance.showCancel = config.showCancel ?? false;
    instance.confirmText = config.confirmText ?? 'Aceptar';
    instance.cancelText = config.cancelText ?? 'Cancelar';

    // Suscribirse a los eventos
    instance.confirm.subscribe(() => {
      this.alertResult.next(true);
      this.destroy();
    });

    instance.cancel.subscribe(() => {
      this.alertResult.next(false);
      this.destroy();
    });

    // Detectar cambios
    this.componentRef.changeDetectorRef.detectChanges();

    return new Promise<boolean>((resolve) => {
      this.alertResult.subscribe((result) => {
        resolve(result);
        this.alertResult = new Subject<boolean>();
      });
    });
  }

  private destroy() {
    if (this.componentRef) {
      const element = this.componentRef.location.nativeElement;
      this.componentRef.destroy();
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }

  showNotification(title: string, message: string, type: AlertType): Promise<any> {
    return this.show({
      title,
      message,
      type,
      showCancel: false,
      confirmText: 'OK'
    });
  }
  
}
