/**
 * Validations de formulaires (sans dépendances externes)
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { valid: false, error: "L'email est requis." };
  if (!re.test(email)) return { valid: false, error: "Email invalide." };
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "Le mot de passe est requis." };
  if (password.length < 8)
    return { valid: false, error: "Minimum 8 caractères." };
  return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
  if (!username) return { valid: false, error: "Le nom d'utilisateur est requis." };
  if (username.length < 3) return { valid: false, error: "Minimum 3 caractères." };
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    return {
      valid: false,
      error: "Uniquement lettres, chiffres, _ et -",
    };
  return { valid: true };
}
