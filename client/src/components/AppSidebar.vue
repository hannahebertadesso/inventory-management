<template>
  <aside class="sidebar" :class="{ open, collapsed }">
    <div class="sidebar-brand">
      <!-- Compact mark, only displayed in rail mode (decorative; the h1 below keeps the accessible name) -->
      <div class="brand-mark" aria-hidden="true">{{ brandInitial }}</div>
      <div class="brand-text">
        <h1 class="brand-name">{{ t('nav.companyName') }}</h1>
        <span class="brand-subtitle">{{ t('nav.subtitle') }}</span>
      </div>
      <button
        type="button"
        class="collapse-toggle"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="collapsed ? 'false' : 'true'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="$emit('toggle')"
      >
        <svg class="toggle-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
             stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Main">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        :title="collapsed ? item.label : null"
        :aria-label="collapsed ? item.label : null"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none"
             stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          <path v-for="d in icons[item.icon]" :key="d" :d="d" />
        </svg>
        <span class="link-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <slot name="footer" />
    </div>
  </aside>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'

// All nav icons live here (24x24 grid, stroke only). Each entry is a list of path strings.
const icons = {
  overview: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  inventory: ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8'],
  orders: ['M9 5h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2', 'M9 3h6v4H9z', 'M8 12h8', 'M8 16h5'],
  finance: ['M12 2v20', 'M17 6.5C16 5.5 14.5 5 12.5 5 10 5 8 6.2 8 8s1.7 2.7 4.5 3.3S17 13 17 15s-2 3.5-4.5 3.5c-2 0-3.8-.6-5-1.8'],
  demand: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  reports: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h6']
}

export default {
  name: 'AppSidebar',
  props: {
    open: { type: Boolean, default: false },
    // Icon-only rail. The parent already forces this to false below 900px (drawer shows full labels).
    collapsed: { type: Boolean, default: false }
  },
  emits: ['toggle'],
  setup() {
    const { t } = useI18n()
    // Styling keys off router-link-exact-active: "/" would be active on every route with
    // router-link-active, and no destination here has child routes.
    const items = computed(() => [
      { to: '/', label: t('nav.overview'), icon: 'overview' },
      { to: '/inventory', label: t('nav.inventory'), icon: 'inventory' },
      { to: '/orders', label: t('nav.orders'), icon: 'orders' },
      { to: '/spending', label: t('nav.finance'), icon: 'finance' },
      { to: '/demand', label: t('nav.demandForecast'), icon: 'demand' },
      { to: '/reports', label: 'Reports', icon: 'reports' }
    ])
    // First letter of the company name for the rail mark; Array.from keeps multi-byte (e.g. Japanese) characters intact.
    const brandInitial = computed(() => (Array.from(t('nav.companyName') || '')[0] || '').toUpperCase())
    return { t, items, icons, brandInitial }
  }
}
</script>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-3);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  z-index: var(--z-sidebar);
}

.sidebar-brand {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3) var(--space-5);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

/* Hidden unless the sidebar is in rail mode */
.brand-mark {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
}

.collapse-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.collapse-toggle:hover {
  background: var(--sidebar-item-hover);
  color: var(--color-text);
}

.collapse-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Chevron points left to collapse, flips to point right to expand */
.toggle-icon {
  transition: transform var(--sidebar-transition);
}

.sidebar.collapsed .toggle-icon {
  transform: rotate(180deg);
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  /* Only the link list scrolls; the footer stays outside any overflow container
     so its upward dropdowns are never clipped. */
  overflow-y: auto;
  min-height: 0;
}

.sidebar-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--sidebar-text);
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--transition), color var(--transition);
}

.sidebar-link:hover {
  background: var(--sidebar-item-hover);
  color: var(--color-text);
}

.sidebar-link.router-link-exact-active {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

/* Accent indicator bar on the active item */
.sidebar-link.router-link-exact-active::before {
  content: '';
  position: absolute;
  /* left: 0, not negative: .sidebar-nav has overflow-y:auto, which would clip anything outside it. */
  left: 0;
  top: var(--space-2);
  bottom: var(--space-2);
  width: 3px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-accent);
}

.sidebar-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

/* ---- Rail (icons-only) mode ----
   The parent only sets `collapsed` at >=900px, so none of this applies to the drawer. */
.sidebar.collapsed .brand-text {
  /* Visually hidden, not display:none, so the h1 stays in the accessibility tree */
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.sidebar.collapsed .link-label {
  /* Same visually-hidden pattern; links also get aria-label/title as a fallback */
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.sidebar.collapsed .sidebar-brand {
  flex-direction: column;
  align-items: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar.collapsed .brand-mark {
  display: flex;
}

.sidebar.collapsed .sidebar-link {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar.collapsed .sidebar-footer {
  align-items: center;
}

@media (prefers-reduced-motion: reduce) {
  .toggle-icon {
    transition: none;
  }
}

@media (max-width: 899px) {
  /* The drawer is always full width with labels; the collapse control does not apply */
  .collapse-toggle {
    display: none;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-width);
    transform: translateX(-100%);
    /* visibility keeps the off-screen links out of the tab order while closed;
       the delay lets the slide-out finish before hiding. */
    visibility: hidden;
    transition: transform var(--transition), visibility 0s linear 150ms;
  }

  .sidebar.open {
    transform: none;
    visibility: visible;
    box-shadow: var(--shadow-lg);
    transition: transform var(--transition), visibility 0s;
  }
}
</style>
