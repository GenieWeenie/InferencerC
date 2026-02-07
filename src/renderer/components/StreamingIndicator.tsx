import React from 'react';
import { Clock } from 'lucide-react';

interface StreamingIndicatorProps {
    className?: string;
}

const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ className = '' }) => {
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

    React.useEffect(() => {
        const startTime = Date.now();

        const intervalId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedSeconds(elapsed);
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-2 text-slate-400 ${className}`}>
            <Clock
                size={14}
                className="animate-pulse opacity-70"
                strokeWidth={2}
            />
            <span className="text-xs font-mono tabular-nums">
                {formatTime(elapsedSeconds)}
            </span>
        </div>
    );
};

export default React.memo(StreamingIndicator);
