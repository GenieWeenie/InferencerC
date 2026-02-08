import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
    progress: number; // 0-100
    showPercentage?: boolean;
    className?: string;
    height?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'purple' | 'gray';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    showPercentage = true,
    className = '',
    height = 'md',
    color = 'blue'
}) => {
    // Clamp progress between 0 and 100
    const clampedProgress = Math.min(100, Math.max(0, progress));

    const heightClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };

    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        gray: 'bg-gray-500'
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between mb-1">
                {showPercentage && (
                    <span className="text-sm text-gray-400 font-medium">
                        {clampedProgress.toFixed(0)}%
                    </span>
                )}
            </div>
            <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
                <motion.div
                    className={`${heightClasses[height]} ${colorClasses[color]} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedProgress}%` }}
                    transition={{
                        duration: 0.3,
                        ease: 'easeInOut'
                    }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
