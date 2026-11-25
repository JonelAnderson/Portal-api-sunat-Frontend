// angular import
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // public props
  isDarkTheme = signal<string>('');
  isRtlTheme = signal<boolean>(false);
  isBoxTheme = signal<boolean>(false);
}
