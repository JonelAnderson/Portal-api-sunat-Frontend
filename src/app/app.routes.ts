import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [

    {
      path: '',
      pathMatch: 'full',
      redirectTo: 'private',
    },
     {
      path: 'private',
      canActivate: [AuthGuard],
      children: [
        {
          path: '',
          loadChildren: () => import('./private/private.module').then(p => p.PrivateModule),
        },
      ],
    }, 
    {
      path: '',
      children: [
        {
          path: '',
          loadChildren: () => import('./public/public.module').then(m => m.PublicModule),
        },
      ],
    },
  ];