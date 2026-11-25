/**
 * Claves que nunca debe haber en localStorage del portal (solo van los tokens y el vencimiento): si otra app del mismo origen
 * o una versión anterior dejó permisos, menú o datos personales, se borran al arrancar.
 */
const LEGACY_KEYS = [
  'userPermissions',
  'userMenu',
  'pictureUrl',
  'selectedIdKey'
];

export function removeLegacyStorageKeys(): void {
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // sin acceso a localStorage (modo privado estricto): nada que limpiar
  }
}
