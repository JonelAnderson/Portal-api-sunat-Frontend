/** Utilidades para los códigos de recuperación del MFA (Fase 12a). */

export function recoveryCodesText(codes: string[], userName?: string): string {
  const header = [
    'Panel API SUNAT - Códigos de recuperación de la verificación en dos pasos',
    userName ? `Correo: ${userName}` : null,
    `Generados: ${new Date().toLocaleString()}`,
    'Cada código sirve una sola vez. Guárdelos en un lugar seguro.',
    ''
  ].filter((l) => l !== null);
  return [...header, ...codes].join('\r\n') + '\r\n';
}

/** Copia texto al portapapeles; devuelve true si lo logró. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // se intenta el método antiguo
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Descarga los códigos como archivo .txt (Blob, sin pasar por el servidor). */
export function downloadRecoveryCodes(codes: string[], userName?: string): void {
  const blob = new Blob([recoveryCodesText(codes, userName)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'panel-api-sunat-codigos-recuperacion.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
