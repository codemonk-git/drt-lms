import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-box">
        <h1>Login</h1>
        <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter your email"
              [class.error]="isFieldInvalid('email')"
            />
            <span class="error-message" *ngIf="isFieldInvalid('email')">
              Please enter a valid email
            </span>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="Enter your password"
              [class.error]="isFieldInvalid('password')"
            />
            <span class="error-message" *ngIf="isFieldInvalid('password')">
              Password must be at least 6 characters
            </span>
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading" class="btn-login">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>

          <div class="error-message general" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </form>

        <div class="signup-link">
          <p>Don't have an account? <a routerLink="/signup">Sign up here</a></p>
        </div>

        <p class="demo-creds">Demo: Use any email and password (min 6 chars)</p>
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .login-box {
        background: white;
        padding: 40px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 400px;
      }

      h1 {
        text-align: center;
        margin-bottom: 30px;
        color: #333;
      }

      .form-group {
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        color: #555;
        font-weight: 500;
      }

      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 14px;
        transition: border-color 0.3s;
        box-sizing: border-box;
      }

      input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
      }

      input.error {
        border-color: #e74c3c;
      }

      .error-message {
        color: #e74c3c;
        font-size: 12px;
        margin-top: 5px;
        display: block;
      }

      .error-message.general {
        margin-top: 15px;
        text-align: center;
      }

      .btn-login {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .btn-login:hover:not(:disabled) {
        transform: translateY(-2px);
      }

      .btn-login:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .demo-creds {
        text-align: center;
        color: #999;
        font-size: 12px;
        margin-top: 20px;
      }

      .signup-link {
        text-align: center;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }

      .signup-link p {
        color: #666;
        margin: 0;
      }

      .signup-link a {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
        cursor: pointer;
      }

      .signup-link a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (user) => {
          this.isLoading = false;
          

          // Navigate to dashboard using Angular router
          // AuthService has already stored tokens and company_slug in localStorage
          // Guard will use stored data to initialize tenant context
          
          this.router.navigate(['/dashboard']);
        },
        error: (error: any) => {
          this.isLoading = false;
          

          // Handle different error types
          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (error.error && error.error.detail) {
            this.errorMessage = error.error.detail;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Login failed. Please try again.';
          }
        },
      });
    }
  }

  private generateSlugFromCompanyId(companyId: string): string {
    // For now, use a simple approach
    // In production, the API response should include the company slug
    return companyId.substring(0, 3).toLowerCase();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
