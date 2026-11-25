// Angular Import
import { Component, EventEmitter, Input,Output, } from '@angular/core';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-alert',
  imports: [CommonModule,NgIf, NgClass, MatIconModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  // public props
  @Input() title!: string;
  @Input() message!: string;
  @Input() type!: string;
  @Input() showCancel: boolean = false;
  @Input() showClose: boolean = true;
  @Input() confirmText: string = 'Aceptar';
  @Input() cancelText: string = 'Cancelar';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) {
      this.onCancel();
    }
  }
}
