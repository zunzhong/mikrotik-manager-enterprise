export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export class PasswordPolicyService {
  public validate(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password))
      errors.push('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password))
      errors.push('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(password))
      errors.push('Password must contain at least one special character.');

    return { valid: errors.length === 0, errors };
  }
}

export const passwordPolicyService = new PasswordPolicyService();
