import { Route } from '@angular/router';
import { App, OverviewComponent } from './app';

export const Routes: Route[] = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    component: App,
    children: [
      {
        path: '',
        component: OverviewComponent,
      },
    ],
  },
];
