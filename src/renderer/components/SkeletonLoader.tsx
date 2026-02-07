import React from 'react';

interface SkeletonLoaderProps {
    variant?: 'text' | 'circle' | 'rect';
    width?: string;
    height?: string;
    className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'text',
    width,
    height,
    className = ''
}) => {
    // Base classes for all variants
    const baseClasses = 'bg-slate-700 animate-pulse';

    // Variant-specific classes
    const variantClasses = {
        text: 'rounded h-4',
        circle: 'rounded-full',
        rect: 'rounded-lg'
    };

    // Default dimensions for variants if not provided
    const defaultDimensions = {
        text: { width: 'w-full', height: '' },
        circle: { width: 'w-10', height: 'h-10' },
        rect: { width: 'w-full', height: 'h-24' }
    };

    const widthClass = width || defaultDimensions[variant].width;
    const heightClass = height || defaultDimensions[variant].height;

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${heightClass} ${className}`}
        />
    );
};

export default SkeletonLoader;
