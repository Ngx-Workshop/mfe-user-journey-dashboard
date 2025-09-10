import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { DynamicGridListComponent } from './dynamic-grid-list/dynamic-grid-list.component';

export const slideInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ opacity: 0 }),
    animate('700ms', style({ opacity: 1 })),
  ]),
]);

@Component({
  selector: 'mfe-user-journey-dashboard',
  imports: [DynamicGridListComponent],
  template: `<ngx-dynamic-grid-list></ngx-dynamic-grid-list>`,
})
export class OverviewComponent {}

@Component({
  selector: 'mfe-user-journey-dashboard',
  imports: [RouterModule],
  animations: [slideInAnimation],
  template: `
    <div class="container" [@routeAnimations]="prepareRoute(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class App {
  prepareRoute(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }
}

// 👇 **IMPORTANT FOR DYMANIC LOADING**
export default App;
