<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar :open="sidebarOpen" :collapsed="sidebarCollapsed" @toggle="toggleSidebarCollapsed">
      <template #footer>
        <LanguageSwitcher :collapsed="sidebarCollapsed" />
        <ProfileMenu
          :collapsed="sidebarCollapsed"
          @show-profile-details="showProfileDetails = true"
          @show-tasks="showTasks = true"
        />
      </template>
    </AppSidebar>

    <!-- Mobile only: tapping the backdrop closes the drawer -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

    <div class="app-main">
      <div class="mobile-bar">
        <button
          type="button"
          class="menu-button"
          aria-label="Open navigation"
          :aria-expanded="sidebarOpen ? 'true' : 'false'"
          @click="sidebarOpen = true"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
               stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="mobile-title">{{ t('nav.companyName') }}</span>
      </div>
      <FilterBar />
      <main class="app-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import AppSidebar from './components/AppSidebar.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher,
    AppSidebar
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const sidebarOpen = ref(false)
    const route = useRoute()

    // ---- Collapsible sidebar ----
    // userCollapsed: null = no explicit choice (use the viewport default), true/false = user's choice.
    const STORAGE_KEY = 'sidebar-collapsed'
    const readPref = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEY)
        return v === 'true' ? true : v === 'false' ? false : null
      } catch (e) {
        return null // storage blocked (private mode etc.)
      }
    }
    const userCollapsed = ref(readPref())

    // Viewport buckets tracked via matchMedia; initialised synchronously to avoid a first-paint flash.
    const desktopMq = window.matchMedia('(min-width: 900px)')
    const wideMq = window.matchMedia('(min-width: 1200px)')
    const isDesktop = ref(desktopMq.matches)
    const isWide = ref(wideMq.matches)
    const onDesktop = (e) => { isDesktop.value = e.matches }
    const onWide = (e) => { isWide.value = e.matches }

    // Rail mode applies only at >=900px (below that the drawer always shows full labels).
    // With no explicit choice, 900-1199px defaults to the rail and wider screens to full.
    const sidebarCollapsed = computed(() => {
      if (!isDesktop.value) return false
      return userCollapsed.value !== null ? userCollapsed.value : !isWide.value
    })

    const toggleSidebarCollapsed = () => {
      // Flip what the user currently sees, so an explicit choice always matches the click.
      userCollapsed.value = !sidebarCollapsed.value
      try {
        localStorage.setItem(STORAGE_KEY, String(userCollapsed.value))
      } catch (e) {
        // Persistence is best effort; the in-memory choice still applies this session.
      }
    }

    // Close the mobile drawer after navigating
    watch(() => route.path, () => { sidebarOpen.value = false })

    const onKeydown = (e) => {
      if (e.key === 'Escape') sidebarOpen.value = false
    }
    onMounted(() => {
      window.addEventListener('keydown', onKeydown)
      desktopMq.addEventListener('change', onDesktop)
      wideMq.addEventListener('change', onWide)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeydown)
      desktopMq.removeEventListener('change', onDesktop)
      wideMq.removeEventListener('change', onWide)
    })
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      showProfileDetails,
      showTasks,
      sidebarOpen,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Visible keyboard focus everywhere; mouse clicks do not show the ring. */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ---- Shell ---- */
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
  /* Animates the sidebar column width when collapsing/expanding */
  transition: grid-template-columns var(--sidebar-transition);
}

@media (min-width: 900px) {
  .app-shell.sidebar-collapsed {
    grid-template-columns: var(--sidebar-width-collapsed) minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell {
    transition: none;
  }
}

/* minmax(0, 1fr) and min-width: 0: without them wide tables and SVG charts
   stretch the grid track and push the page into horizontal scroll. */
.app-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  padding: var(--space-5) var(--space-6);
}

.mobile-bar,
.sidebar-backdrop {
  display: none;
}

@media (max-width: 899px) {
  .app-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-content {
    padding: var(--space-4);
  }

  .mobile-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .mobile-title {
    font-weight: var(--weight-semibold);
    color: var(--color-text);
  }

  .menu-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  .menu-button:hover {
    background: var(--color-surface-muted);
  }

  /* Above content and filter bar, below the sidebar drawer (z-sidebar) and modals (1000+) */
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    z-index: var(--z-backdrop);
  }
}

/* ---- Page header ---- */
.page-header {
  margin-bottom: var(--space-5);
}

.page-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-1);
  letter-spacing: -0.025em;
}

.page-header p {
  color: var(--color-text-muted);
  font-size: var(--text-base);
}

/* ---- Cards ---- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.stat-label {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  letter-spacing: -0.025em;
}

.stat-card.warning .stat-value { color: var(--color-warning); }
.stat-card.success .stat-value { color: var(--color-success); }
.stat-card.danger .stat-value { color: var(--color-danger); }
.stat-card.info .stat-value { color: var(--color-info); }

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  letter-spacing: -0.01em;
}

/* ---- Tables ---- */
.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: var(--weight-semibold);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

td {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-body);
  font-size: var(--text-base);
}

tbody tr {
  transition: background-color var(--transition);
}

tbody tr:hover {
  background: var(--color-surface-muted);
}

/* ---- Badges ---- */
.badge {
  display: inline-block;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge.success,
.badge.increasing { background: var(--color-success-soft); color: var(--color-success-text); }

.badge.warning,
.badge.medium { background: var(--color-warning-soft); color: var(--color-warning-text); }

.badge.danger,
.badge.decreasing,
.badge.high { background: var(--color-danger-soft); color: var(--color-danger-text); }

.badge.info,
.badge.low { background: var(--color-info-soft); color: var(--color-info-text); }

.badge.stable { background: var(--color-neutral-soft); color: var(--color-neutral-text); }

/* ---- Buttons and inputs (global defaults; views with scoped styles override) ---- */
button {
  font-family: inherit;
}

input,
select {
  font-family: inherit;
}

input:focus-visible,
select:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

/* ---- States ---- */
.loading {
  text-align: center;
  padding: var(--space-7);
  color: var(--color-text-muted);
  font-size: var(--text-base);
}

.error {
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-soft);
  color: var(--color-danger-text);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  margin: var(--space-4) 0;
  font-size: var(--text-base);
}
</style>
