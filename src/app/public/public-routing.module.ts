import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { SignInComponent } from './pages/login/sign-in/sign-in.component';
import { ActivateComponent } from './pages/activate/activate.component';

/** Login (con MFA) y activación de la cuenta con el enlace de la invitación (`/activar?token=`). Sin "olvidé mi contraseña": la consola vuelve a invitar. */
const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'sign-in',
        pathMatch: 'full'
      },
      {
        path: 'sign-in',
        component: SignInComponent
      },
      {
        path: 'activar',
        component: ActivateComponent
      },
      {
        path: '**',
        redirectTo: 'sign-in',
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }
