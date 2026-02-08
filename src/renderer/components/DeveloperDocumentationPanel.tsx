import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ClipboardCopy, Link2, Play, Search, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    APIReferenceEndpoint,
    developerDocsService,
    IntegrationGuide,
    PluginTutorial,
    TroubleshootingEntry,
} from '../services/developerDocs';

interface DeveloperDocumentationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenAPIPlayground: () => void;
}

type DocumentationTab = 'api' | 'integrations' | 'plugins' | 'troubleshooting';

const methodStyles: Record<APIReferenceEndpoint['method'], string> = {
    GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    DELETE: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const tabButtonClass = (isActive: boolean): string => (
    `px-3 py-2 rounded-md text-xs font-semibold transition-colors border ${
        isActive
            ? 'bg-primary/20 border-primary/40 text-primary'
            : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
    }`
);

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success('Copied code example');
    };

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-950/80 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{language || 'text'}</span>
                <button
                    onClick={copyCode}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Copy"
                >
                    <ClipboardCopy size={12} />
                </button>
            </div>
            <pre className="p-3 text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
    );
};

const APISection: React.FC<{ endpoints: APIReferenceEndpoint[]; onOpenAPIPlayground: () => void }> = ({
    endpoints,
    onOpenAPIPlayground,
}) => {
    return (
        <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="text-sm font-semibold text-white">Interactive Playground</div>
                    <div className="text-xs text-slate-400">Test any endpoint directly from the docs.</div>
                </div>
                <button
                    onClick={onOpenAPIPlayground}
                    className="px-3 py-2 rounded-md bg-primary/20 border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors flex items-center gap-2"
                >
                    <Play size={12} /> Open API Playground
                </button>
            </div>

            {endpoints.map(endpoint => (
                <div key={`${endpoint.method}-${endpoint.path}`} className="p-4 rounded-lg border border-slate-700 bg-slate-900/60 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded border text-[10px] font-bold ${methodStyles[endpoint.method]}`}>
                            {endpoint.method}
                        </span>
                        <code className="text-xs text-slate-200 break-all">{endpoint.path}</code>
                    </div>

                    <p className="text-xs text-slate-400">{endpoint.description}</p>

                    {endpoint.parameters.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-300">Parameters</div>
                            <div className="space-y-1">
                                {endpoint.parameters.map(parameter => (
                                    <div
                                        key={`${endpoint.path}-${parameter.name}`}
                                        className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded px-2 py-1"
                                    >
                                        <span className="text-slate-200">{parameter.name}</span> ({parameter.in}, {parameter.type})
                                        {parameter.required ? ' required' : ' optional'}: {parameter.description}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {endpoint.requestExample && <CodeBlock language="bash" code={endpoint.requestExample} />}
                    <CodeBlock language="json" code={endpoint.responseExample} />
                </div>
            ))}
        </div>
    );
};

const IntegrationsSection: React.FC<{ guides: IntegrationGuide[] }> = ({ guides }) => {
    return (
        <div className="space-y-3">
            {guides.map(guide => (
                <div key={guide.id} className="p-4 rounded-lg border border-slate-700 bg-slate-900/60 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-white">{guide.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{guide.summary}</p>
                    </div>

                    <div>
                        <div className="text-[11px] font-semibold text-slate-300 mb-1">Prerequisites</div>
                        <div className="space-y-1">
                            {guide.prerequisites.map(item => (
                                <div key={`${guide.id}-pre-${item}`} className="text-[11px] text-slate-400">• {item}</div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-[11px] font-semibold text-slate-300 mb-1">Setup</div>
                        <div className="space-y-1">
                            {guide.setupSteps.map((step, index) => (
                                <div key={`${guide.id}-step-${index}`} className="text-[11px] text-slate-400">{index + 1}. {step}</div>
                            ))}
                        </div>
                    </div>

                    <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                        Verify: {guide.verification}
                    </div>

                    <div>
                        <div className="text-[11px] font-semibold text-slate-300 mb-1">Common Errors</div>
                        <div className="space-y-1">
                            {guide.commonErrors.map(error => (
                                <div key={`${guide.id}-error-${error}`} className="text-[11px] text-amber-300">• {error}</div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const PluginSection: React.FC<{ tutorial: PluginTutorial }> = ({ tutorial }) => {
    return (
        <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/60">
                <h3 className="text-sm font-semibold text-white">{tutorial.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Sample plugin path: <code>{tutorial.samplePluginPath}</code></p>
                <div className="mt-3 space-y-1">
                    {tutorial.steps.map((step, index) => (
                        <div key={`plugin-step-${index}`} className="text-[11px] text-slate-400">{index + 1}. {step}</div>
                    ))}
                </div>
            </div>

            <CodeBlock language="json" code={tutorial.manifestExample} />
            <CodeBlock language="javascript" code={tutorial.entryPointExample} />
        </div>
    );
};

const TroubleshootingSection: React.FC<{ entries: TroubleshootingEntry[] }> = ({ entries }) => {
    return (
        <div className="space-y-3">
            {entries.map(entry => (
                <div key={entry.id} className="p-4 rounded-lg border border-slate-700 bg-slate-900/60 space-y-2">
                    <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                    <p className="text-xs text-slate-400"><span className="text-slate-300">Symptoms:</span> {entry.symptoms}</p>
                    <p className="text-xs text-slate-400"><span className="text-slate-300">Likely Cause:</span> {entry.likelyCause}</p>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-300 mb-1">Resolution</div>
                        <div className="space-y-1">
                            {entry.resolution.map((step, index) => (
                                <div key={`${entry.id}-resolution-${index}`} className="text-[11px] text-slate-400">{index + 1}. {step}</div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const DeveloperDocumentationPanel: React.FC<DeveloperDocumentationPanelProps> = ({
    isOpen,
    onClose,
    onOpenAPIPlayground,
}) => {
    const [activeTab, setActiveTab] = React.useState<DocumentationTab>('api');
    const [searchQuery, setSearchQuery] = React.useState('');

    React.useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setActiveTab('api');
        }
    }, [isOpen]);

    const apiReference = React.useMemo(() => developerDocsService.getApiReference(), []);
    const integrationGuides = React.useMemo(() => developerDocsService.getIntegrationGuides(), []);
    const pluginTutorial = React.useMemo(() => developerDocsService.getPluginTutorial(), []);
    const troubleshooting = React.useMemo(() => developerDocsService.getTroubleshootingGuide(), []);

    const query = searchQuery.trim().toLowerCase();

    const filteredApi = React.useMemo(
        () => apiReference.filter(endpoint =>
            !query
            || endpoint.path.toLowerCase().includes(query)
            || endpoint.description.toLowerCase().includes(query)
            || endpoint.method.toLowerCase().includes(query)
        ),
        [apiReference, query]
    );

    const filteredIntegrations = React.useMemo(
        () => integrationGuides.filter(guide =>
            !query
            || guide.name.toLowerCase().includes(query)
            || guide.summary.toLowerCase().includes(query)
            || guide.setupSteps.some(step => step.toLowerCase().includes(query))
        ),
        [integrationGuides, query]
    );

    const filteredTroubleshooting = React.useMemo(
        () => troubleshooting.filter(entry =>
            !query
            || entry.title.toLowerCase().includes(query)
            || entry.symptoms.toLowerCase().includes(query)
            || entry.likelyCause.toLowerCase().includes(query)
        ),
        [troubleshooting, query]
    );

    const hasResults =
        (activeTab === 'api' && filteredApi.length > 0)
        || (activeTab === 'integrations' && filteredIntegrations.length > 0)
        || (activeTab === 'plugins' && !query)
        || (activeTab === 'troubleshooting' && filteredTroubleshooting.length > 0);

    if (!isOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    onClick={event => event.stopPropagation()}
                    className="w-full max-w-7xl h-[90vh] bg-slate-950 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col"
                >
                    <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-primary" />
                            <div>
                                <h2 className="text-base font-semibold text-white">Developer Documentation Hub</h2>
                                <p className="text-xs text-slate-400">API reference, integrations, plugin tutorial, and troubleshooting.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-800 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setActiveTab('api')} className={tabButtonClass(activeTab === 'api')}>
                                API Reference
                            </button>
                            <button onClick={() => setActiveTab('integrations')} className={tabButtonClass(activeTab === 'integrations')}>
                                Integrations
                            </button>
                            <button onClick={() => setActiveTab('plugins')} className={tabButtonClass(activeTab === 'plugins')}>
                                Plugin Tutorial
                            </button>
                            <button onClick={() => setActiveTab('troubleshooting')} className={tabButtonClass(activeTab === 'troubleshooting')}>
                                Troubleshooting
                            </button>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={searchQuery}
                                onChange={event => setSearchQuery(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-primary/50"
                                placeholder="Search current section"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {!hasResults ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                                <ShieldAlert size={24} className="text-slate-500" />
                                <p className="text-sm">No matches for this section.</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'api' && <APISection endpoints={filteredApi} onOpenAPIPlayground={onOpenAPIPlayground} />}
                                {activeTab === 'integrations' && <IntegrationsSection guides={filteredIntegrations} />}
                                {activeTab === 'plugins' && (
                                    query
                                        ? (
                                            <div className="text-xs text-slate-400 p-4 border border-slate-700 rounded-lg bg-slate-900/60">
                                                Plugin tutorial search uses API/integration troubleshooting sections. Clear query to view the full plugin tutorial.
                                            </div>
                                        )
                                        : <PluginSection tutorial={pluginTutorial} />
                                )}
                                {activeTab === 'troubleshooting' && <TroubleshootingSection entries={filteredTroubleshooting} />}
                            </>
                        )}
                    </div>

                    <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                        <Link2 size={12} />
                        Docs source: /docs markdown files and /src/renderer/services/developerDocs.ts
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
