import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-item"
          [class.toast-success]="toast.type === 'success'"
          [class.toast-error]="toast.type === 'error'"
          [class.toast-info]="toast.type === 'info'"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <span class="message">{{ toast.message }}</span>
          <button type="button" class="dismiss" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss message">
            x
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        top: 82px;
        right: 16px;
        z-index: 250;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: min(420px, calc(100vw - 32px));
      }

      .toast-item {
        border-radius: 8px;
        padding: 10px 12px;
        color: #fff;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }

      .toast-success {
        background: rgba(16, 185, 129, 0.95);
      }

      .toast-error {
        background: rgba(239, 68, 68, 0.96);
      }

      .toast-info {
        background: rgba(37, 99, 235, 0.95);
      }

      .message {
        line-height: 1.35;
      }

      .dismiss {
        border: none;
        background: transparent;
        color: inherit;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.85;
        padding: 0;
        line-height: 1;
      }

      .dismiss:hover {
        opacity: 1;
      }
    `,
  ],
})
export class ToastContainerComponent {
  constructor(public readonly toastService: ToastService) {}
}
