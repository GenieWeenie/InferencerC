import React, { useEffect, useState } from 'react';
import { MessageSquare, Gauge } from 'lucide-react';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { backendHealthService } from '../services/backendHealth';

interface Stats {
  cpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  gpuUsage: number;
  gpuMemUsed: number;
  gpuMemTotal: number;
  gpuName: string;
}

interface StatusBarProps {
  tokenCount?: number;
  maxTokens?: number;
  contextWindowUsage?: number;
  messageCount?: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
  tokenCount = 0,
  maxTokens = 8192,
  contextWindowUsage = 0,
  messageCount = 0
}) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const { online: isBackendOnline } = useBackendHealth();

  useEffect(() => {
    if (!isBackendOnline) {
      setStats(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let nextDelayMs = 2000;

    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/v1/stats');
        const data = await res.json();
        if (cancelled) return;
        setStats(data);
        backendHealthService.reportRequestResult(true);
        nextDelayMs = 2000;
      } catch (e) {
        backendHealthService.reportRequestResult(false);
        // Back off when local backend is unavailable to avoid noisy retry storms.
        nextDelayMs = Math.min(nextDelayMs * 2, 15000);
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(fetchStats, nextDelayMs);
        }
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isBackendOnline]);

  const contextPercentage = (contextWindowUsage / maxTokens) * 100;
  const isNearLimit = contextPercentage > 80;
  const isApproachingLimit = contextPercentage > 60;

  if (!stats) return <div className="h-7 bg-slate-900 border-t border-slate-800"></div>;

  return (
    <div className="h-8 bg-slate-950 border-t border-slate-800/50 text-slate-400 text-[10px] tracking-wide flex items-center px-4 gap-6 font-mono select-none z-20">
      {/* Token Counter */}
      {tokenCount > 0 && (
        <div title="Total tokens in conversation" className="flex items-center gap-1.5">
          <MessageSquare size={10} className="text-primary" />
          <span className="text-slate-200 font-medium">{tokenCount.toLocaleString()}</span>
          <span className="text-slate-600">tokens</span>
        </div>
      )}

      {/* Context Window Usage */}
      {contextWindowUsage > 0 && (
        <div title={`Context window: ${contextWindowUsage.toLocaleString()} / ${maxTokens.toLocaleString()} tokens`} className="flex items-center gap-1.5">
          <Gauge size={10} className={isNearLimit ? 'text-red-500' : isApproachingLimit ? 'text-yellow-500' : 'text-blue-400'} />
          <span className={isNearLimit ? 'text-red-500 font-bold' : isApproachingLimit ? 'text-yellow-500' : 'text-slate-200'}>
            {contextPercentage.toFixed(0)}%
          </span>
          <span className="text-slate-600 hidden sm:inline">context</span>
        </div>
      )}

      {/* Message Count */}
      {messageCount > 0 && (
        <div title="Messages in conversation" className="flex items-center gap-1.5">
          <span className="text-slate-200">{messageCount}</span>
          <span className="text-slate-600">msgs</span>
        </div>
      )}

      <div title="CPU Utilization" className="flex items-center gap-1.5">
        <span>CPU:</span>
        <span className={stats.cpuUsage > 80 ? 'text-red-500 font-bold' : 'text-slate-200'}>{stats.cpuUsage}%</span>
      </div>

      <div title="System RAM" className="flex items-center gap-1.5">
        <span>RAM:</span>
        <span className="text-slate-200">{(stats.ramUsed / 1024).toFixed(1)}GB</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-500">{(stats.ramTotal / 1024).toFixed(1)}GB</span>
      </div>

      <div className="flex-1"></div>

      <div title={stats.gpuName} className="flex items-center gap-1.5">
        <span className="text-slate-500 hidden sm:inline">{stats.gpuName}</span>
        <span>GPU:</span>
        <span className={stats.gpuUsage > 80 ? 'text-red-500 font-bold' : 'text-slate-200'}>{stats.gpuUsage}%</span>
      </div>

      <div title="GPU VRAM" className="flex items-center gap-1.5">
        <span>VRAM:</span>
        <span className="text-slate-200">{(stats.gpuMemUsed / 1024).toFixed(1)}GB</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-500">{(stats.gpuMemTotal / 1024).toFixed(1)}GB</span>
      </div>

      <div className="text-emerald-500 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        Ready
      </div>
    </div>
  );
};

export default StatusBar;
