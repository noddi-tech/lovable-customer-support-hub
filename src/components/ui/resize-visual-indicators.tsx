import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizeIndicatorProps {
  isResizing: boolean;
  currentSize: number;
  snapPositions?: number[];
  className?: string;
}

export const ResizeIndicator: React.FC<ResizeIndicatorProps> = ({
  isResizing,
  currentSize,
  snapPositions = [25, 33, 50, 67, 75],
  className
}) => {
  const [showIndicator, setShowIndicator] = useState(false);
  const [nearestSnap, setNearestSnap] = useState<number | null>(null);

  useEffect(() => {
    if (isResizing) {
      setShowIndicator(true);
      
      // Find nearest snap position
      const snapThreshold = 3; // 3% threshold for snap indication
      const nearest = snapPositions.find(snap => 
        Math.abs(currentSize - snap) <= snapThreshold
      );
      setNearestSnap(nearest || null);
    } else {
      // Hide indicator after a delay
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setNearestSnap(null);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isResizing, currentSize, snapPositions]);

  if (!showIndicator) return null;

  return (
    <div className={cn(
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
      "bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg",
      "animate-fade-in pointer-events-none z-50",
      nearestSnap && "border-primary bg-primary/10",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">
          {Math.round(currentSize)}%
        </div>
        
        {nearestSnap && (
          <div className="text-xs text-primary">
            Snap to {nearestSnap}%
          </div>
        )}
      </div>
      
      {/* Visual size bar */}
      <div className="mt-1 w-20 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full bg-primary transition-all duration-200",
            nearestSnap && "bg-primary/80"
          )}
          style={{ width: `${Math.min(currentSize, 100)}%` }}
        />
      </div>
    </div>
  );
};

interface SnapPositionIndicatorsProps {
  snapPositions: number[];
  currentSize: number;
  isVisible: boolean;
  containerRef: React.RefObject<HTMLElement>;
  orientation?: 'horizontal' | 'vertical';
}

export const SnapPositionIndicators: React.FC<SnapPositionIndicatorsProps> = ({
  snapPositions,
  currentSize,
  isVisible,
  containerRef,
  orientation = 'horizontal'
}) => {
  if (!isVisible || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();
  const snapThreshold = 5; // 5% threshold for highlighting

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {snapPositions.map((position) => {
        const isNear = Math.abs(currentSize - position) <= snapThreshold;
        const positionPx = orientation === 'horizontal' 
          ? containerRect.left + (containerRect.width * position / 100)
          : containerRect.top + (containerRect.height * position / 100);

        return (
          <div
            key={position}
            className={cn(
              "absolute transition-all duration-200",
              orientation === 'horizontal' 
                ? "w-px h-full bg-primary/30" 
                : "h-px w-full bg-primary/30",
              isNear && "bg-primary/60 shadow-lg",
              "animate-fade-in"
            )}
            style={{
              [orientation === 'horizontal' ? 'left' : 'top']: positionPx,
              [orientation === 'horizontal' ? 'top' : 'left']: 
                orientation === 'horizontal' ? containerRect.top : containerRect.left,
              [orientation === 'horizontal' ? 'height' : 'width']: 
                orientation === 'horizontal' ? containerRect.height : containerRect.width
            }}
          >
            {/* Snap position label */}
            <div className={cn(
              "absolute bg-primary/90 text-primary-foreground text-xs px-1 py-0.5 rounded",
              "whitespace-nowrap transform",
              orientation === 'horizontal' 
                ? "top-2 -translate-x-1/2" 
                : "left-2 -translate-y-1/2",
              isNear ? "opacity-100 scale-100" : "opacity-60 scale-90",
              "transition-all duration-200"
            )}>
              {position}%
            </div>
          </div>
        );
      })}
    </div>
  );
};