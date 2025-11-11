import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmailAttachment } from '@/utils/emailFormatting';
import { createBlobUrl } from '@/utils/imageAssetHandler';

interface ImageLightboxProps {
  images: EmailAttachment[];
  currentIndex: number;
  isOpen: boolean;
  messageId?: string;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onIndexChange: (index: number) => void;
}

export const ImageLightbox = ({
  images,
  currentIndex,
  isOpen,
  messageId,
  onClose,
  onNext,
  onPrevious,
}: ImageLightboxProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  
  const currentImage = images[currentIndex];
  
  // Load current image
  useEffect(() => {
    if (currentImage && isOpen) {
      setZoom(1); // Reset zoom when changing images
      createBlobUrl(currentImage, messageId).then(url => {
        setImageUrl(url);
      });
    }
  }, [currentImage, messageId, isOpen]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrevious, onClose]);
  
  const handleDownload = async () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = currentImage.filename || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[95vh] flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
          
          {/* Image counter */}
          <div className="absolute top-4 left-4 z-50 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
          
          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white bg-black/50 px-3 py-2 rounded text-sm">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/20"
                onClick={onPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/20"
                onClick={onNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
          
          {/* Image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={currentImage.filename || 'Image'}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          )}
          
          {/* Filename */}
          {currentImage.filename && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 text-white bg-black/50 px-4 py-2 rounded text-sm max-w-md truncate">
              {currentImage.filename}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
