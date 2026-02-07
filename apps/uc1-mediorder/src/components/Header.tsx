import { currentRoute } from '../router';

export function Header() {
  const route = currentRoute.value;
  const current = route?.route ?? '/';

  return (
    <header class="header">
      <h1>MediOrder</h1>
      <nav class="nav">
        <a href="#/" aria-current={current === '/' ? 'page' : undefined}>
          Scan
        </a>
        <a href="#/history" aria-current={current === '/history' ? 'page' : undefined}>
          MedPlan
        </a>
        <a href="#/settings" aria-current={current === '/settings' ? 'page' : undefined}>
          ⚙
        </a>
      </nav>
    </header>
  );
}
