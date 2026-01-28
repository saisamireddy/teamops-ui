import { Component } from '@angular/core';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet],
  template: `
    <h1>TeamOps Dashboard</h1>
     <router-outlet></router-outlet>
  `,
})
export class App {}
