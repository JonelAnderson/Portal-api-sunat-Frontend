export class GradientConfig {
  static layout = 'vertical'; // vertical, horizontal
  static subLayout = ''; // horizontal-2
  static isCollapse_menu = false; // true
  static layoutType = 'menu-light'; // menu-dark, menu-light, dark
  static header_back_color = 'header-blue'; // header-blue, header-red, header-purple, header-info, header-dark, header-orange
  static isRtlLayout = false; // true
  static nav_fixed_layout = true; // false
  static header_fixed_layout = true; // false
  static isBoxLayout = false; // true
  static i18n = 'en'; // en, fr, ro, cn

  static readonly defaults = {
    layout: 'vertical',
    subLayout: '',
    isCollapse_menu: false,
    layoutType: 'menu-light',
    header_back_color: 'header-blue',
    isRtlLayout: false,
    nav_fixed_layout: true,
    header_fixed_layout: true,
    isBoxLayout: false,
    i18n: 'en'
  };
}

/** Alias used by private layout (plantilla-demo naming). */
export { GradientConfig as GradientAppConfig };

export const DASHBOARD_PATH = 'private/home';
