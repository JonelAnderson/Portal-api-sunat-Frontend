import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler   {

  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const notificationService = this.injector.get(NotificationService);
    

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 301:
           notificationService.showError("El recurso se ha movido permanentemente a una nueva ubicación.", "MOVIDO PERMANENTEMENTE");
           break;
        case 302:
           notificationService.showError("El recurso se ha movido temporalmente.", "REDIRECCIÓN TEMPORAL");
           break;
        case 400:
          notificationService.showError("La solicitud enviada contiene datos inválidos o incompletos. Verifica la información ingresada e intenta nuevamente.", "SOLICITUD INCORRECTA");
          break;
        case 401:
          notificationService.showError("No tienes una sesión válida o tu sesión ha expirado. Por favor, inicia sesión nuevamente.", "ACCESO NO AUTORIZADO");
          break;
        case 403:
          notificationService.showError("No tienes permisos suficientes para acceder a este recurso.", "ACCESO DENEGADO");
          break;
        case 404:
          notificationService.showError("El recurso que buscas no existe o ha sido movido. Verifica la URL o contacte a soporte si crees que esto es un Error.","RECURSO NO ENCONTRADO");
          break;
        case 405:
           notificationService.showError("Método HTTP no permitido.", "MÉTODO NO PERMITIDO");
           break;
        case 408:
           notificationService.showError("El tiempo de espera de la solicitud se ha agotado.", "TIEMPO DE ESPERA AGOTADO");
           break;
        case 409:
           notificationService.showError("Existe un conflicto con el estado actual del recurso.", "CONFLICTO");
           break;
        case 410:
           notificationService.showError("El recurso solicitado ha sido eliminado permanentemente y ya no está disponible.", "RECURSO ELIMINADO");
           break;
        case 415:
           notificationService.showError("Tipo de archivo no soportado.", "TIPO DE MEDIO NO SOPORTADO");
           break;
        case 422:
           notificationService.showError("No se pudo procesar la entidad enviada.", "ENTIDAD NO PROCESABLE");
           break;
        case 429:
           notificationService.showError("Has realizado demasiadas solicitudes en poco tiempo. Por favor, espera un momento.", "DEMASIADAS SOLICITUDES");
           break;
        case 500:
          notificationService.showError("Ocurrió un problema inesperado en el servidor. Estamos trabajando para solucionarlo. Inténtelo nuevamente más tarde.","ERROR SERVIDOR");
           break;
        default:
          notificationService.showError("Ocurrió un error inesperado. Por favor, inténtelo nuevamente o contacte a soporte si el problema persiste.","Error Desconocido");
      }
    } else {
      notificationService.showError( "Ocurrió un error inesperado. Por favor, inténtelo nuevamente o contacte a soporte si el problema persiste.","Error Desconocido");
    }

    // Log the error to the console (can be removed in production)
    if (!error.status || error.status !== 403) {
      console.error(error);
    } 
  }
}
