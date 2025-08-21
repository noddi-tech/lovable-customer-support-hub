import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

export const LazyImage = memo(({
  src,
  alt,
  placeholderSrc,
  fallbackSrc,
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError,
  className,
  ...props
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholderSrc);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    const currentImg = imgRef.current;
    if (currentImg) {
      observer.observe(currentImg);
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if (!inView) return;

    const imageLoader = new Image();
    
    const handleLoad = () => {
      setImageSrc(src);
      setImageLoaded(true);
      setImageError(false);
      onLoad?.();
    };

    const handleError = () => {
      setImageError(true);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
      onError?.();
    };

    imageLoader.addEventListener('load', handleLoad);
    imageLoader.addEventListener('error', handleError);
    
    imageLoader.src = src;

    return () => {
      imageLoader.removeEventListener('load', handleLoad);
      imageLoader.removeEventListener('error', handleError);
    };
  }, [inView, src, fallbackSrc, onLoad, onError]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          imageLoaded && !imageError ? 'opacity-100' : 'opacity-70',
          className
        )}
        {...props}
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {imageError && !fallbackSrc && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-muted-foreground text-sm text-center">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <p>Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';