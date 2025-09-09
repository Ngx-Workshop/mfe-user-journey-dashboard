import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ExampleMongodbDocListComponent } from './components/example-mongodb-doc-list.component';

@Component({
  selector: 'ngx-seed-mfe',
  imports: [MatButtonModule, ExampleMongodbDocListComponent],
  template: `
    <ngx-example-mongodb-doc-list></ngx-example-mongodb-doc-list>
  `,
  styles: [``],
})
export class App {}

// 👇 **IMPORTANT FOR DYMANIC LOADING**
export default App;
