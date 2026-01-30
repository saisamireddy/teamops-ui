import { Component } from '@angular/core';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet, HeaderComponent],
  template: `
    <app-header></app-header>
     <router-outlet></router-outlet>
  `,
})
export class App {}
