import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="signup-container">
      <div class="signup-box">
        <!-- Stepper -->
        <div class="stepper">
          <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
            <div class="step-number">1</div>
            <div class="step-label">Account</div>
          </div>
          <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
            <div class="step-number">2</div>
            <div class="step-label">Company</div>
          </div>
          <div class="step" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
            <div class="step-number">3</div>
            <div class="step-label">Verify</div>
          </div>
          <div class="step" [class.active]="currentStep === 4" [class.completed]="currentStep > 4">
            <div class="step-number">4</div>
            <div class="step-label">Complete</div>
          </div>
        </div>

        <!-- Step 1: Account Info -->
        <div *ngIf="currentStep === 1" class="step-content">
          <h2>Create Your Account</h2>
          <form [formGroup]="accountForm" (ngSubmit)="onStep1Submit()">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="your.email@example.com"
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
                placeholder="At least 8 characters"
                [class.error]="isFieldInvalid('password')"
              />
              <span class="error-message" *ngIf="isFieldInvalid('password')">
                Password must be at least 8 characters
              </span>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                placeholder="Confirm your password"
                [class.error]="isFieldInvalid('confirmPassword')"
              />
              <span
                class="error-message"
                *ngIf="accountForm.get('confirmPassword')?.errors?.['required']"
              >
                Please confirm your password
              </span>
              <span
                class="error-message"
                *ngIf="accountForm.get('confirmPassword')?.errors?.['pattern']"
              >
                Passwords do not match
              </span>
            </div>

            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                formControlName="firstName"
                placeholder="John"
                [class.error]="isFieldInvalid('firstName')"
              />
              <span class="error-message" *ngIf="isFieldInvalid('firstName')">
                First name is required
              </span>
            </div>

            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                formControlName="lastName"
                placeholder="Doe"
                [class.error]="isFieldInvalid('lastName')"
              />
              <span class="error-message" *ngIf="isFieldInvalid('lastName')">
                Last name is required
              </span>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                [disabled]="accountForm.invalid || isLoading"
                class="btn-primary"
              >
                {{ isLoading ? 'Creating Account...' : 'Next' }}
              </button>
            </div>

            <div class="error-message general" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>
          </form>
        </div>

        <!-- Step 2: Company Info -->
        <div *ngIf="currentStep === 2" class="step-content">
          <h2>Company Information</h2>
          <form [formGroup]="companyForm" (ngSubmit)="onStep2Submit()">
            <div class="form-group">
              <label for="companyName">Company Name</label>
              <input
                id="companyName"
                type="text"
                formControlName="companyName"
                placeholder="Your Company"
                [class.error]="isFieldInvalid('companyName')"
              />
              <span class="error-message" *ngIf="isFieldInvalid('companyName')">
                Company name is required
              </span>
            </div>

            <div class="form-group">
              <label for="industry">Industry (Optional)</label>
              <input
                id="industry"
                type="text"
                formControlName="industry"
                placeholder="Technology, Healthcare, etc."
              />
            </div>

            <div class="form-group">
              <label for="website">Website (Optional)</label>
              <input
                id="website"
                type="url"
                formControlName="website"
                placeholder="https://yourcompany.com"
              />
            </div>

            <div class="subdomain-preview">
              <label>Your Dashboard URL:</label>
              <div class="subdomain">
                {{
                  (companyForm.get('companyName')?.value || 'yourcompany').toLowerCase()
                }}.localhost:4200/dashboard
              </div>
            </div>

            <div class="form-actions">
              <button type="button" (click)="currentStep = 1" class="btn-secondary">Back</button>
              <button
                type="submit"
                [disabled]="companyForm.invalid || isLoading"
                class="btn-primary"
              >
                {{ isLoading ? 'Creating Company...' : 'Next' }}
              </button>
            </div>

            <div class="error-message general" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>
          </form>
        </div>

        <!-- Step 3: Email Verification -->
        <div *ngIf="currentStep === 3" class="step-content">
          <h2>Verify Your Email</h2>
          <p class="info-text">
            We've sent a verification link to <strong>{{ accountForm.get('email')?.value }}</strong>
          </p>

          <!-- DEV MODE: Show OTP -->
          <div class="dev-otp-section" *ngIf="devOtp">
            <div class="dev-badge">DEV MODE</div>
            <p class="dev-text">Verification code (for development):</p>
            <div class="dev-otp-display">
              <code>{{ devOtp }}</code>
              <button type="button" (click)="copyDevOtp()" class="copy-btn">Copy</button>
            </div>
          </div>

          <form [formGroup]="verificationForm" (ngSubmit)="onStep3Submit()">
            <div class="form-group">
              <label for="verificationCode">Verification Code</label>
              <input
                id="verificationCode"
                type="text"
                formControlName="code"
                placeholder="Enter the code from your email"
                [class.error]="isFieldInvalid('code')"
              />
              <span class="error-message" *ngIf="isFieldInvalid('code')">
                Verification code is required
              </span>
            </div>

            <div class="form-actions">
              <button type="button" (click)="currentStep = 2" class="btn-secondary">Back</button>
              <button
                type="submit"
                [disabled]="verificationForm.invalid || isLoading"
                class="btn-primary"
              >
                {{ isLoading ? 'Verifying...' : 'Verify Email' }}
              </button>
            </div>

            <p class="resend-text">
              Didn't receive an email?
              <button type="button" (click)="resendVerificationEmail()" class="link-button">
                Resend
              </button>
            </p>

            <div class="error-message general" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>
          </form>
        </div>

        <!-- Step 4: Complete -->
        <div *ngIf="currentStep === 4" class="step-content">
          <h2>Setup Complete!</h2>

          <div class="summary">
            <div class="summary-item">
              <label>Account:</label>
              <span
                >{{ accountForm.get('firstName')?.value }}
                {{ accountForm.get('lastName')?.value }}</span
              >
            </div>
            <div class="summary-item">
              <label>Email:</label>
              <span>{{ accountForm.get('email')?.value }}</span>
            </div>
            <div class="summary-item">
              <label>Company:</label>
              <span>{{ companyForm.get('companyName')?.value }}</span>
            </div>
            <div class="summary-item">
              <label>Dashboard:</label>
              <span
                >{{
                  (companyForm.get('companyName')?.value || 'yourcompany').toLowerCase()
                }}.localhost:4200/dashboard</span
              >
            </div>
          </div>

          <div class="terms" [formGroup]="verificationForm">
            <input type="checkbox" id="terms" formControlName="terms" />
            <label for="terms"> I agree to the Terms of Service and Privacy Policy </label>
          </div>

          <div class="form-actions">
            <button type="button" (click)="goBack()" class="btn-secondary">Back</button>
            <button type="button" (click)="onCompleteSignup()" class="btn-primary btn-large">
              {{ isLoading ? 'Creating Account...' : 'Go to Dashboard' }}
            </button>
          </div>

          <div class="error-message general" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Already have account -->
        <p class="signin-link">
          Already have an account?
          <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .signup-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
      }

      .signup-box {
        background: white;
        padding: 40px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 500px;
      }

      .stepper {
        display: flex;
        justify-content: space-between;
        margin-bottom: 40px;
        gap: 10px;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        opacity: 0.5;
        transition: opacity 0.3s;
      }

      .step.active,
      .step.completed {
        opacity: 1;
      }

      .step-number {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #666;
        margin-bottom: 8px;
        font-size: 14px;
      }

      .step.active .step-number {
        background: #667eea;
        color: white;
      }

      .step.completed .step-number {
        background: #4caf50;
        color: white;
      }

      .step-label {
        font-size: 12px;
        text-align: center;
        color: #666;
      }

      .step-content {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      h2 {
        text-align: center;
        margin-bottom: 30px;
        color: #333;
        font-size: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
        font-size: 14px;
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
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      input.error {
        border-color: #e74c3c;
      }

      .error-message {
        display: block;
        color: #e74c3c;
        font-size: 12px;
        margin-top: 4px;
      }

      .error-message.general {
        display: block;
        padding: 12px;
        background: #fadbd8;
        border-left: 4px solid #e74c3c;
        margin: 20px 0;
        border-radius: 4px;
      }

      .subdomain-preview {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }

      .subdomain {
        background: white;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        color: #667eea;
        font-size: 13px;
        word-break: break-all;
        margin-top: 8px;
      }

      .info-text {
        text-align: center;
        color: #666;
        margin-bottom: 20px;
        line-height: 1.6;
      }

      .summary {
        background: #f9f9f9;
        padding: 20px;
        border-radius: 5px;
        margin: 20px 0;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #eee;
      }

      .summary-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }

      .summary-item label {
        margin-bottom: 0;
        color: #666;
        font-weight: 500;
      }

      .summary-item span {
        color: #333;
        font-weight: 600;
      }

      .terms {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 20px 0;
      }

      .terms input {
        width: auto;
        margin: 0;
      }

      .terms label {
        margin-bottom: 0;
        display: inline;
        font-size: 13px;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        margin: 30px 0;
      }

      .btn-primary,
      .btn-secondary {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-primary {
        background: #667eea;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #5568d3;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
      }

      .btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #eee;
        color: #333;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #ddd;
      }

      .btn-large {
        font-size: 16px;
        padding: 14px;
      }

      .link-button {
        background: none;
        border: none;
        color: #667eea;
        cursor: pointer;
        text-decoration: underline;
        font-size: 13px;
        padding: 0;
      }

      .link-button:hover {
        color: #5568d3;
      }

      .resend-text {
        text-align: center;
        font-size: 13px;
        color: #666;
        margin-top: 15px;
      }

      .dev-otp-section {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }

      .dev-badge {
        display: inline-block;
        background: #ffc107;
        color: #333;
        font-size: 11px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 3px;
        margin-bottom: 10px;
      }

      .dev-text {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 13px;
      }

      .dev-otp-display {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dev-otp-display code {
        background: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        flex: 1;
        word-break: break-all;
        border: 1px solid #ddd;
      }

      .copy-btn {
        background: #ffc107;
        color: #333;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }

      .copy-btn:hover {
        background: #ffb300;
      }

      .signin-link {
        text-align: center;
        margin-top: 20px;
        color: #666;
        font-size: 14px;
      }

      .signin-link a {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
      }

      .signin-link a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class SignupComponent implements OnInit {
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  devOtp = ''; // Development OTP for testing

  accountForm!: FormGroup;
  companyForm!: FormGroup;
  verificationForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.initializeForms();
  }

  initializeForms() {
    this.accountForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
    });

    this.companyForm = this.fb.group({
      companyName: ['', Validators.required],
      industry: [''],
      website: [''],
    });

    this.verificationForm = this.fb.group({
      code: ['', Validators.required],
      terms: [false], // Optional for development
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const form = this.getCurrentForm();
    const field = form?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getCurrentForm(): FormGroup {
    switch (this.currentStep) {
      case 1:
        return this.accountForm;
      case 2:
        return this.companyForm;
      case 3:
        return this.verificationForm;
      default:
        return this.accountForm;
    }
  }

  onStep1Submit() {
    if (this.accountForm.invalid) return;

    // Validate passwords match
    if (
      this.accountForm.get('password')?.value !== this.accountForm.get('confirmPassword')?.value
    ) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.currentStep = 2;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  onStep2Submit() {
    if (this.companyForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const signupData = {
      email: this.accountForm.get('email')?.value,
      password: this.accountForm.get('password')?.value,
      first_name: this.accountForm.get('firstName')?.value,
      last_name: this.accountForm.get('lastName')?.value,
      company_name: this.companyForm.get('companyName')?.value,
    };

    

    // Call backend signup endpoint
    this.authService.signup(signupData).subscribe({
      next: (response: any) => {
        
        this.isLoading = false;

        // Store the dev OTP for development testing
        if (response.dev_verification_code) {
          this.devOtp = response.dev_verification_code;
          
        }

        
        this.currentStep = 3;
        // Reset only the code field, keep terms as false
        this.verificationForm.reset({ code: '', terms: false });
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        
        this.isLoading = false;
        this.errorMessage =
          error.error?.detail || error.message || 'Signup failed. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  onStep3Submit() {
    if (this.verificationForm.invalid) return;

    this.currentStep = 4;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  resendVerificationEmail() {
    // TODO: Call backend to resend verification email
    this.errorMessage = '';
  }

  copyDevOtp() {
    if (this.devOtp) {
      navigator.clipboard.writeText(this.devOtp).then(() => {
        // Optional: Show a brief success message
        const originalText = 'Copy';
        const button = event?.target as HTMLButtonElement;
        if (button) {
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      });
    }
  }

  onCompleteSignup() {
    // Check if terms are agreed
    if (!this.verificationForm.get('terms')?.value) {
      this.errorMessage = 'You must agree to the Terms of Service and Privacy Policy';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Signup was already called in Step 2, so just redirect to dashboard
    // Use the company slug from the stored company name
    const slug = this.companyForm
      .get('companyName')
      ?.value.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/_/g, '-');

    // Simulate async operation for consistency, then redirect
    setTimeout(() => {
      window.location.href = `http://${slug}.localhost:4200/dashboard`;
    }, 500);
  }

  goBack() {
    this.currentStep = 3;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }
}
