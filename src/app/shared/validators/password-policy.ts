import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Política de contraseña del panel (API SUNAT, §3 del contrato): 8 a 64 caracteres, al menos una mayúscula,
 * una minúscula, un número y un carácter especial. La hace cumplir también el servidor.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export interface PasswordRule {
  key: 'length' | 'upper' | 'lower' | 'digit' | 'special';
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'length',
    label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH && v.length <= PASSWORD_MAX_LENGTH
  },
  { key: 'upper', label: 'Al menos una letra mayúscula', test: (v) => /[A-ZÑÁÉÍÓÚÜ]/.test(v) },
  { key: 'lower', label: 'Al menos una letra minúscula', test: (v) => /[a-zñáéíóúü]/.test(v) },
  { key: 'digit', label: 'Al menos un número', test: (v) => /\d/.test(v) },
  // Cualquier carácter que no sea letra ni número.
  { key: 'special', label: 'Al menos un carácter especial (ej. @ # $ % ! *)', test: (v) => /[^A-Za-z0-9ÑñÁÉÍÓÚáéíóúÜü\s]/.test(v) }
];

/** Reglas que aún no se cumplen para el valor dado. */
export function failedPasswordRules(value: string | null | undefined): PasswordRule[] {
  const v = value ?? '';
  return PASSWORD_RULES.filter((r) => !r.test(v));
}

/**
 * Validador reutilizable. Error: `{ passwordPolicy: { failed: string[] } }`.
 * Un valor vacío no se valida aquí (lo cubre `Validators.required`).
 */
export const passwordPolicyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value == null ? '' : String(control.value);
  if (value === '') {
    return null;
  }
  const failed = failedPasswordRules(value);
  return failed.length ? { passwordPolicy: { failed: failed.map((r) => r.key) } } : null;
};

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener entre 8 y 64 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.';
