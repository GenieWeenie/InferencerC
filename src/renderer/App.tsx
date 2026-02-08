import React, { useState, Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import Chat from './pages/Chat';
import StatusBar from './components/StatusBar';
import TitleBar from './components/TitleBar';
import { MessageSquare, FolderOpen, Settings as SettingsIcon, Hexagon, Zap, LayoutGrid, Loader2, Menu, X } from 'lucide-react';

// Lazy load heavy pages
function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  key: string
) {
  return React.lazy(async () => {
    const storageKey = `lazy-retry:${key}`;
    const hasWindow = typeof window !== 'undefined';
    const sessionStore = hasWindow ? window.sessionStorage : null;

    const importWithBackoff = async () => {
      try {
        return await importFn();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return importFn();
      }
    };

    try {
      const mod = await importWithBackoff();
      sessionStore?.removeItem(storageKey);
      return mod;
    } catch (error) {
      const alreadyReloaded = sessionStore?.getItem(storageKey) === '1';
      if (hasWindow && !alreadyReloaded) {
        sessionStore?.setItem(storageKey, '1');
        window.location.reload();
        // Keep this lazy promise pending while the page reloads.
        await new Promise<never>(() => {});
      }
      sessionStore?.removeItem(storageKey);
      throw error;
    }
  });
}

const Models = lazyWithRetry(() => import('./pages/Models'), 'models');
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'settings');
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette'), 'command-palette');
const ShortcutEditor = lazyWithRetry(() => import('./components/ShortcutEditor'), 'shortcut-editor');
const PerformanceMonitor = lazyWithRetry(
  () => import('./components/PerformanceMonitor').then((mod) => ({ default: mod.PerformanceMonitor })),
  'performance-monitor'
);
const FeatureDiscoveryManager = lazyWithRetry(
  () => import('./components/FeatureDiscovery').then((mod) => ({ default: mod.FeatureDiscoveryManager })),
  'feature-discovery'
);
const ContextualHelpManager = lazyWithRetry(
  () => import('./components/ContextualHelpTooltip').then((mod) => ({ default: mod.ContextualHelpManager })),
  'contextual-help'
);
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useShortcutEditor } from './hooks/useKeyboardShortcuts';
import { useCommandRegistry } from './hooks/useCommandRegistry';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'settings'>('chat');
  const { isOpen, close } = useCommandPalette();
  const { isOpen: isShortcutEditorOpen, toggle: toggleShortcutEditor, close: closeShortcutEditor } = useShortcutEditor();

  const [showPerformance, setShowPerformance] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobileLayout = viewportWidth < 1024;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileNavOpen(false);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: 'chat' | 'models' | 'settings' }>;
      const tab = customEvent.detail?.tab;
      if (tab === 'chat' || tab === 'models' || tab === 'settings') {
        setActiveTab(tab);
      }
    };

    window.addEventListener('app:navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('app:navigate-tab', handleNavigateTab as EventListener);
  }, []);

  // Register commands
  useCommandRegistry({
    setActiveTab,
    toggleShortcuts: toggleShortcutEditor,
    togglePerformanceMonitor: () => setShowPerformance(prev => !prev),
  });

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`group relative flex items-center justify-center w-12 h-12 mb-3 rounded-2xl transition-all duration-300 ${activeTab === id
        ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
        : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
        }`}
      title={label}
    >
      <Icon size={24} strokeWidth={activeTab === id ? 2.5 : 2} />
      {activeTab === id && (
        <motion.div
          layoutId="active-pill"
          className="absolute -left-1 w-1 h-8 bg-white/50 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-screen font-sans bg-background text-text overflow-hidden selection:bg-primary/30">

      {/* Custom Window Title Bar */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden relative">

        {/* ULTRA-SLIM SIDEBAR (Desktop) */}
        {!isMobileLayout && (
          <div className="w-[72px] bg-background border-r border-border/50 flex flex-col items-center py-4 z-50">
            <div className="mb-6 p-2 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
              <Hexagon size={28} className="text-white fill-white/20" strokeWidth={2.5} />
            </div>

            <div className="flex-1 w-full px-2 flex flex-col items-center">
              <NavItem id="chat" icon={MessageSquare} label="Chat" />
              <NavItem id="models" icon={LayoutGrid} label="Models" />
              <div className="h-px w-8 bg-slate-800 my-3 rounded-full" />
              <button className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center text-slate-500 hover:text-amber-400 transition-colors mb-3">
                <Zap size={20} />
              </button>
            </div>

            <div className="mt-auto mb-4 w-full px-2 flex flex-col items-center">
              <NavItem id="settings" icon={SettingsIcon} label="Settings" />
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 mt-2 hover:border-primary transition-colors cursor-pointer" title="User Profile"></div>
            </div>
          </div>
        )}

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative">
          {isMobileLayout && (
            <>
              <button
                onClick={() => setMobileNavOpen(prev => !prev)}
                className="absolute top-3 left-3 z-30 w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 flex items-center justify-center"
                aria-label="Toggle navigation menu"
                title="Menu"
              >
                {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <AnimatePresence>
                {mobileNavOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setMobileNavOpen(false)}
                      className="absolute inset-0 z-20 bg-black/40"
                    />
                    <motion.div
                      initial={{ x: -260, opacity: 0.9 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -260, opacity: 0.9 }}
                      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                      className="absolute top-0 left-0 z-30 w-64 h-full bg-slate-900/95 border-r border-slate-700 p-4"
                    >
                      <div className="mb-5 p-2 bg-gradient-to-br from-primary to-blue-600 rounded-xl inline-flex">
                        <Hexagon size={22} className="text-white fill-white/20" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => setActiveTab('chat')}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => setActiveTab('models')}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'models' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          Models
                        </button>
                        <button
                          onClick={() => setActiveTab('settings')}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          Settings
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900/0 to-transparent pointer-events-none" />

          <main className="flex-1 overflow-hidden relative z-10">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
              <AnimatePresence mode="wait">
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <Chat />
                  </motion.div>
                )}
                {activeTab === 'models' && (
                  <motion.div
                    key="models"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <Models />
                  </motion.div>
                )}
                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <Settings />
                  </motion.div>
                )}
              </AnimatePresence>
            </Suspense>
          </main>
        </div>
      </div>

      {/* Feature Discovery */}
      <Suspense fallback={null}>
        <FeatureDiscoveryManager />
      </Suspense>

      {/* Contextual Help */}
      <Suspense fallback={null}>
        <ContextualHelpManager />
      </Suspense>

      {/* FOOTER STATS BAR */}
      <StatusBar />

      {/* PERFORMANCE MONITOR */}
      {showPerformance && (
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      )}

      {/* COMMAND PALETTE */}
      {isOpen && (
        <Suspense fallback={null}>
          <CommandPalette isOpen={isOpen} onClose={close} />
        </Suspense>
      )}

      {/* SHORTCUT EDITOR */}
      {isShortcutEditorOpen && (
        <Suspense fallback={null}>
          <ShortcutEditor isOpen={isShortcutEditorOpen} onClose={closeShortcutEditor} />
        </Suspense>
      )}

      <Toaster richColors position="top-center" theme="dark" />
    </div>
  );
};

export default App;
