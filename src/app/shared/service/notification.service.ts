import { Injectable } from '@angular/core';
import { IndividualConfig, ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private toastr: ToastrService) { }

  showSuccess(message: string, title:string) {
    this.toastr.success(message, title);

  }

  showError(message: string, title: string) {
    this.toastr.error(message, title);
  }

  showInfo(message: string, title: string) {
    this.toastr.info(message, title);

  }

  showWarning(message: string, title: string,config?: Partial<IndividualConfig>) {
    this.toastr.warning(message, title, config);
  }

}
