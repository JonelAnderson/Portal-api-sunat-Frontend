import { Component, computed, input } from '@angular/core';
import { PASSWORD_RULES } from '@shared/validators/password-policy';

/** Lista visible de requisitos de la contraseña; cada uno se marca al cumplirse (Fase 12a). */
@Component({
  selector: 'app-password-requirements',
  template: `
    <ul class="list-unstyled small mb-2 password-requirements">
      @for (rule of rules(); track rule.key) {
        <li [class.text-success]="rule.ok" [class.text-muted]="!rule.ok">
          <em class="feather me-1" [class.icon-check-circle]="rule.ok" [class.icon-circle]="!rule.ok"></em>
          {{ rule.label }}
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .password-requirements li {
        line-height: 1.6;
      }
    `
  ]
})
export class PasswordRequirementsComponent {
  /** Valor actual de la contraseña. */
  readonly value = input<string | null | undefined>('');

  readonly rules = computed(() => {
    const v = this.value() ?? '';
    return PASSWORD_RULES.map((r) => ({ key: r.key, label: r.label, ok: r.test(v) }));
  });
}
