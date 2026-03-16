import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  public toasts: Observable<Toast[]> = this.toasts$.asObservable();
  private toastId = 0;

  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  private show(message: string, type: Toast['type'], duration: number): void {
    const id = `toast-${++this.toastId}`;
    const toast: Toast = { id, message, type, duration };

    const currentToasts = this.toasts$.value;
    this.toasts$.next([...currentToasts, toast]);

    setTimeout(() => {
      const updated = this.toasts$.value.filter((t) => t.id !== id);
      this.toasts$.next(updated);
    }, duration);
  }

  remove(id: string): void {
    const updated = this.toasts$.value.filter((t) => t.id !== id);
    this.toasts$.next(updated);
  }
}
