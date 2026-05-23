export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: any;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export function validateRequestBody(
  body: any,
  requiredFields: string[],
  rules: ValidationRule[] = []
): ValidationResult {
  const errors: string[] = [];
  const validatedData: any = {};

  // Check required fields
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`${field} is required`);
      continue;
    }
    validatedData[field] = body[field];
  }

  // If required fields are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Apply validation rules
  for (const rule of rules) {
    const value = body[rule.field];

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      if (rule.required) {
        errors.push(`${rule.field} is required`);
      }
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string`);
          continue;
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${rule.field} format is invalid`);
        }
        break;

      case 'email':
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string`);
        } else if (!isValidEmail(value)) {
          errors.push(`${rule.field} must be a valid email address`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${rule.field} must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${rule.field} must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${rule.field} must be an array`);
        }
        break;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    // Store validated value
    validatedData[rule.field] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validatedData
  };
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/[<>]/g, '');
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}