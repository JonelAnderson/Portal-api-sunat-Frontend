import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from '@shared/components/reusables/not-found/not-found.component';
import { PrivateLayoutComponent } from './layout/private-layout.component';
import { Home } from './pages/home/home';
import { AccountComponent } from './pages/account/account.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { UsageComponent } from './pages/usage/usage.component';
import { CredentialsComponent } from './pages/credentials/credentials.component';

/**
 * Zona privada del portal. Las Urls coinciden con el menú fijo de `MenuNavService` (`PORTAL_MENU`). Sin permisos ni guards por
 * pantalla: el acceso lo decide la API (todo `portal/tenants/{id}/**` responde 404 si la empresa no es del usuario).
 */
const routes: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home },
      { path: 'documents', component: DocumentsComponent },
      { path: 'usage', component: UsageComponent },
      { path: 'credentials', component: CredentialsComponent },
      { path: 'account', component: AccountComponent },
      { path: '**', component: NotFoundComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrivateRoutingModule { }
