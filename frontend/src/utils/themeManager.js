/**
 * GESTOR DE TEMAS (DARK / LIGHT MODE)
 * Alterna entre el Modo Claro (paleta base del rediseno) y su derivada oscura.
 * El modo claro es el predeterminado; el oscuro se deriva de la misma paleta.
 */

const STORAGE_KEY = 'cyberlab_theme';

export class ThemeManager {
  static getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // Modo oscuro como predeterminado de ciberseguridad
  }

  static applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Actualizar botón en la interfaz si existe
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const toggleIcon = document.getElementById('theme-toggle-icon');
    const toggleLabel = document.getElementById('theme-toggle-label');

    if (toggleBtn) {
      toggleBtn.setAttribute('data-active-theme', theme);
      toggleBtn.setAttribute('title', theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro');
      toggleBtn.classList.toggle('is-dark', theme === 'dark');
      toggleBtn.classList.toggle('is-light', theme === 'light');
    }

    if (toggleIcon) {
      toggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    if (toggleLabel) {
      toggleLabel.textContent = theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
    }

    // Disparar evento personalizado por si gráficos u otros componentes necesitan redibujarse
    window.dispatchEvent(new CustomEvent('cyberlab-theme-change', { detail: { theme } }));
  }

  static toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || this.getPreferredTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    return next;
  }

  static init() {
    const initialTheme = this.getPreferredTheme();
    this.applyTheme(initialTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Escuchar cambios del sistema en tiempo real si el usuario no tiene preferencia guardada
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
}
