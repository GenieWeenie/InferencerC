import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    ClipboardList,
    Download,
    FileSpreadsheet,
    FileText,
    KeyRound,
    RefreshCw,
    Shield,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AuditLogEntry,
    ComplianceExportOptions,
    EnterpriseSSOConfig,
    RetentionPolicy,
    SSOSession,
    enterpriseComplianceService,
} from '../services/enterpriseCompliance';

interface EnterpriseCompliancePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

const downloadFile = (fileName: string, mimeType: string, content: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

export const EnterpriseCompliancePanel: React.FC<EnterpriseCompliancePanelProps> = ({ isOpen, onClose }) => {
    const [ssoConfig, setSsoConfig] = React.useState<EnterpriseSSOConfig>(enterpriseComplianceService.getSSOConfig());
    const [retentionPolicy, setRetentionPolicy] = React.useState<RetentionPolicy>(enterpriseComplianceService.getRetentionPolicy());
    const [session, setSession] = React.useState<SSOSession | null>(enterpriseComplianceService.getSSOSession());

    const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
    const [categoryFilter, setCategoryFilter] = React.useState('');
    const [resultFilter, setResultFilter] = React.useState<'all' | 'success' | 'failure' | 'info'>('all');

    const [mockLoginEmail, setMockLoginEmail] = React.useState('admin@company.com');
    const [mockLoginName, setMockLoginName] = React.useState('Enterprise Admin');

    const [exportStandard, setExportStandard] = React.useState<ComplianceExportOptions['standard']>('soc2');
    const [exportFormat, setExportFormat] = React.useState<ComplianceExportOptions['format']>('json');
    const [includePII, setIncludePII] = React.useState(false);

    const refresh = React.useCallback(() => {
        setSsoConfig(enterpriseComplianceService.getSSOConfig());
        setRetentionPolicy(enterpriseComplianceService.getRetentionPolicy());
        setSession(enterpriseComplianceService.getSSOSession());

        setLogs(enterpriseComplianceService.getAuditLogs({
            category: categoryFilter || undefined,
            result: resultFilter === 'all' ? undefined : resultFilter,
            limit: 300,
        }));
    }, [categoryFilter, resultFilter]);

    React.useEffect(() => {
        if (!isOpen) return;

        refresh();
        const unsubscribe = enterpriseComplianceService.subscribe(() => refresh());
        return unsubscribe;
    }, [isOpen, refresh]);

    React.useEffect(() => {
        if (!isOpen) return;
        refresh();
    }, [isOpen, categoryFilter, resultFilter, refresh]);

    const summary = React.useMemo(() => enterpriseComplianceService.getAuditSummary(), [logs]);

    const saveSsoConfig = () => {
        try {
            enterpriseComplianceService.updateSSOConfig(ssoConfig);
            toast.success('SSO configuration saved');
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to save SSO configuration'));
        }
    };

    const saveRetentionPolicy = () => {
        try {
            enterpriseComplianceService.updateRetentionPolicy(retentionPolicy);
            toast.success('Retention policy updated');
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update retention policy'));
        }
    };

    const executeMockLogin = (protocol: 'saml2' | 'oidc') => {
        try {
            const start = protocol === 'saml2'
                ? enterpriseComplianceService.startSAMLLogin()
                : enterpriseComplianceService.startOIDCLogin();

            enterpriseComplianceService.completeSSOLogin({
                protocol,
                state: start.state,
                email: mockLoginEmail,
                displayName: mockLoginName,
            });

            toast.success(`${protocol.toUpperCase()} login completed (mock flow)`);
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Mock login failed'));
        }
    };

    const exportCompliance = () => {
        try {
            const report = enterpriseComplianceService.exportComplianceReport({
                standard: exportStandard,
                format: exportFormat,
                includePII,
            });
            downloadFile(report.fileName, report.mimeType, report.content);
            toast.success(`Exported ${report.recordCount} records`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Compliance export failed'));
        }
    };

    const pruneNow = () => {
        const removed = enterpriseComplianceService.pruneExpiredLogs(Date.now());
        toast.info(`Pruned ${removed} expired audit record${removed === 1 ? '' : 's'}`);
        refresh();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.97, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.97, opacity: 0 }}
                    onClick={(event) => event.stopPropagation()}
                    className="relative w-full max-w-7xl h-[94vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">Enterprise SSO & Audit</h2>
                                <p className="text-xs text-slate-400">SAML/OIDC, retention policy, audit trail, and SOC2/GDPR export</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                    <KeyRound size={14} /> SAML 2.0 Configuration
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={ssoConfig.saml.enabled}
                                        onChange={(e) => setSsoConfig(prev => ({ ...prev, saml: { ...prev.saml, enabled: e.target.checked } }))}
                                    />
                                    Enable SAML
                                </label>
                                <input
                                    type="text"
                                    value={ssoConfig.saml.entryPoint}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, saml: { ...prev.saml, entryPoint: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Entry point URL"
                                />
                                <input
                                    type="text"
                                    value={ssoConfig.saml.issuer}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, saml: { ...prev.saml, issuer: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Issuer"
                                />
                                <textarea
                                    value={ssoConfig.saml.certificate}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, saml: { ...prev.saml, certificate: e.target.value } }))}
                                    className="w-full min-h-[90px] px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="X.509 certificate"
                                />
                                <button
                                    onClick={() => executeMockLogin('saml2')}
                                    className="px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded text-white"
                                >
                                    Test SAML Login
                                </button>
                            </div>

                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                    <KeyRound size={14} /> OIDC/OAuth 2.0 Configuration
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={ssoConfig.oidc.enabled}
                                        onChange={(e) => setSsoConfig(prev => ({ ...prev, oidc: { ...prev.oidc, enabled: e.target.checked } }))}
                                    />
                                    Enable OIDC
                                </label>
                                <input
                                    type="text"
                                    value={ssoConfig.oidc.issuerUrl}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, oidc: { ...prev.oidc, issuerUrl: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Issuer URL"
                                />
                                <input
                                    type="text"
                                    value={ssoConfig.oidc.authorizationEndpoint}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, oidc: { ...prev.oidc, authorizationEndpoint: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Authorization endpoint"
                                />
                                <input
                                    type="text"
                                    value={ssoConfig.oidc.tokenEndpoint}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, oidc: { ...prev.oidc, tokenEndpoint: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Token endpoint"
                                />
                                <input
                                    type="text"
                                    value={ssoConfig.oidc.clientId}
                                    onChange={(e) => setSsoConfig(prev => ({ ...prev, oidc: { ...prev.oidc, clientId: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Client ID"
                                />
                                <button
                                    onClick={() => executeMockLogin('oidc')}
                                    className="px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded text-white"
                                >
                                    Test OIDC Login
                                </button>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                <div className="text-sm font-medium text-slate-200">Mock SSO Identity</div>
                                <input
                                    type="email"
                                    value={mockLoginEmail}
                                    onChange={(e) => setMockLoginEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Email"
                                />
                                <input
                                    type="text"
                                    value={mockLoginName}
                                    onChange={(e) => setMockLoginName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Display name"
                                />

                                <div className="text-xs text-slate-400">
                                    {session
                                        ? `Signed in via ${session.protocol.toUpperCase()} as ${session.displayName} (${session.email})`
                                        : 'No active enterprise SSO session'}
                                </div>
                                {session && (
                                    <button
                                        onClick={() => {
                                            enterpriseComplianceService.clearSSOSession();
                                            refresh();
                                            toast.info('SSO session cleared');
                                        }}
                                        className="px-3 py-2 text-sm bg-rose-700/80 hover:bg-rose-700 rounded text-white"
                                    >
                                        Sign Out SSO Session
                                    </button>
                                )}
                            </div>

                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                <div className="text-sm font-medium text-slate-200">Retention Policy</div>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={retentionPolicy.enabled}
                                        onChange={(e) => setRetentionPolicy(prev => ({ ...prev, enabled: e.target.checked }))}
                                    />
                                    Enable retention pruning
                                </label>
                                <label className="text-xs text-slate-400 block">
                                    Retention days
                                    <input
                                        type="number"
                                        min={1}
                                        value={retentionPolicy.retentionDays}
                                        onChange={(e) => setRetentionPolicy(prev => ({ ...prev, retentionDays: Number(e.target.value) || 1 }))}
                                        className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    />
                                </label>
                                <label className="text-xs text-slate-400 block">
                                    Purge interval (hours)
                                    <input
                                        type="number"
                                        min={1}
                                        value={retentionPolicy.purgeIntervalHours}
                                        onChange={(e) => setRetentionPolicy(prev => ({ ...prev, purgeIntervalHours: Number(e.target.value) || 1 }))}
                                        className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    />
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={retentionPolicy.anonymizePII}
                                        onChange={(e) => setRetentionPolicy(prev => ({ ...prev, anonymizePII: e.target.checked }))}
                                    />
                                    Anonymize PII in exports/logs
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={saveRetentionPolicy} className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 rounded text-white">Save Policy</button>
                                    <button onClick={pruneNow} className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-200">Prune Now</button>
                                </div>
                            </div>
                        </section>

                        <section className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                    <ClipboardList size={14} /> Audit Log
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={saveSsoConfig} className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white">Save SSO Config</button>
                                    <button onClick={refresh} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-200 inline-flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
                                <div className="p-2 bg-slate-900 border border-slate-700 rounded text-slate-200">Total: {summary.totalEntries}</div>
                                <div className="p-2 bg-slate-900 border border-slate-700 rounded text-emerald-300">Success: {summary.successCount}</div>
                                <div className="p-2 bg-slate-900 border border-slate-700 rounded text-rose-300">Failure: {summary.failureCount}</div>
                                <div className="p-2 bg-slate-900 border border-slate-700 rounded text-sky-300">Info: {summary.infoCount}</div>
                                <input
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    placeholder="Filter category"
                                    className="px-2 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                                />
                                <select
                                    value={resultFilter}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'all' || value === 'success' || value === 'failure' || value === 'info') {
                                            setResultFilter(value);
                                        }
                                    }}
                                    className="px-2 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                                >
                                    <option value="all">All results</option>
                                    <option value="success">Success</option>
                                    <option value="failure">Failure</option>
                                    <option value="info">Info</option>
                                </select>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {logs.length === 0 ? (
                                    <div className="text-xs text-slate-500">No audit records match current filters.</div>
                                ) : (
                                    logs.map(log => (
                                        <div key={log.id} className="p-2 bg-slate-900 border border-slate-700 rounded text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-slate-200 font-medium">{log.category} :: {log.action}</div>
                                                <div className={`px-2 py-0.5 rounded ${log.result === 'success' ? 'bg-emerald-900/40 text-emerald-300' : log.result === 'failure' ? 'bg-rose-900/40 text-rose-300' : 'bg-sky-900/40 text-sky-300'}`}>
                                                    {log.result}
                                                </div>
                                            </div>
                                            <div className="text-slate-500">{new Date(log.timestamp).toLocaleString()} by {log.actor.name}</div>
                                            <div className="text-slate-400 break-words">{JSON.stringify(log.details)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                            <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <Download size={14} /> Compliance Export
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                                <select
                                    value={exportStandard}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'soc2' || value === 'gdpr') {
                                            setExportStandard(value);
                                        }
                                    }}
                                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                                >
                                    <option value="soc2">SOC 2</option>
                                    <option value="gdpr">GDPR</option>
                                </select>
                                <select
                                    value={exportFormat}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'json' || value === 'csv') {
                                            setExportFormat(value);
                                        }
                                    }}
                                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
                                >
                                    <option value="json">JSON</option>
                                    <option value="csv">CSV</option>
                                </select>
                                <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200">
                                    <input type="checkbox" checked={includePII} onChange={(e) => setIncludePII(e.target.checked)} />
                                    Include PII
                                </label>
                                <button
                                    onClick={exportCompliance}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white flex items-center justify-center gap-2"
                                >
                                    {exportFormat === 'csv' ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                                    Export
                                </button>
                            </div>
                        </section>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/80 text-xs text-slate-400 flex items-center gap-2">
                        <Check size={12} className="text-emerald-400" />
                        Audit captures enterprise auth, workspace, cloud sync, and chat usage events with retention policy enforcement.
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
