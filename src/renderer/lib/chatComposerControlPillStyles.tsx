import React from 'react';
import {
    Activity,
    BarChart3,
    Brain,
    Check,
    Code2,
    FolderOpen,
    Github,
    Globe,
    Settings,
    Sparkles,
    Users,
} from 'lucide-react';
import type {
    ComposerControlPillDescriptor,
    ComposerControlPillKey,
} from './chatUiModels';

interface ComposerControlPillClassNames {
    inactive: string;
    activePrimary: string;
    activeBlue: string;
    activeBattle: string;
    activeTools: string;
    neutralAction: string;
}

interface ComposerControlPillPresentation {
    icon: React.ReactNode;
    className: string;
    title?: string;
}

type PillPresenter = (
    descriptor: ComposerControlPillDescriptor,
    classNames: ComposerControlPillClassNames
) => ComposerControlPillPresentation;

export const COMPOSER_CONTROL_PILL_CLASS_NAMES: ComposerControlPillClassNames = {
    inactive: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200',
    activePrimary: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    activeBlue: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    activeBattle: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-gradient-to-r from-orange-500 to-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    activeTools: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-primary text-white border-primary animate-pulse',
    neutralAction: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white',
};

const PRESENTERS: Record<ComposerControlPillKey, PillPresenter> = {
    'control-response': (descriptor, classNames) => ({
        icon: descriptor.active ? <Check size={12} strokeWidth={3} /> : <Settings size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
    }),
    tools: (descriptor, classNames) => ({
        icon: <Globe size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activeTools : classNames.inactive,
    }),
    github: (descriptor, classNames) => ({
        icon: <Github size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activeBlue : classNames.inactive,
    }),
    project: (descriptor, classNames) => ({
        icon: <FolderOpen size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activeBlue : classNames.inactive,
    }),
    thinking: (descriptor, classNames) => ({
        icon: <Brain size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
    }),
    battle: (descriptor, classNames) => ({
        icon: <Users size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activeBattle : classNames.inactive,
    }),
    inspector: (descriptor, classNames) => ({
        icon: <Activity size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
    }),
    'expert-config': (descriptor, classNames) => ({
        icon: <Users size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
    }),
    variables: (descriptor, classNames) => ({
        icon: <Code2 size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
        title: 'Insert variables like {{date}}, {{time}}, {{user_name}}',
    }),
    json: (descriptor, classNames) => ({
        icon: <Code2 size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
        title: 'Enable JSON output format',
    }),
    stream: (descriptor, classNames) => ({
        icon: <Activity size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
        title: descriptor.active
            ? 'Disable streaming (get full response at once)'
            : 'Enable streaming (real-time token display)',
    }),
    analytics: (_descriptor, classNames) => ({
        icon: <BarChart3 size={12} strokeWidth={2.5} />,
        className: classNames.neutralAction,
        title: 'View usage analytics and statistics',
    }),
    recommendations: (_descriptor, classNames) => ({
        icon: <Sparkles size={12} strokeWidth={2.5} />,
        className: classNames.neutralAction,
        title: 'Find relevant conversations (Ctrl+Shift+R)',
    }),
    controls: (descriptor, classNames) => ({
        icon: <Settings size={12} strokeWidth={2.5} />,
        className: descriptor.active ? classNames.activePrimary : classNames.inactive,
        title: 'Toggle Controls Panel',
    }),
};

export const resolveComposerControlPillPresentation = (
    descriptor: ComposerControlPillDescriptor
): ComposerControlPillPresentation => {
    const presenter = PRESENTERS[descriptor.key];
    if (!presenter) {
        return {
            icon: null,
            className: COMPOSER_CONTROL_PILL_CLASS_NAMES.inactive,
        };
    }
    return presenter(descriptor, COMPOSER_CONTROL_PILL_CLASS_NAMES);
};
