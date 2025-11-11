import { useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { EmailAttachment } from '@/utils/emailFormatting';
import { createBlobUrl } from '@/utils/imageAssetHandler';

interface ImageThumbnailProps {
  attachment: EmailAttachment;
  messageId?: string;
  onClick: () => void;
}

export const ImageThumbnail = ({ attachment, messageId, onClick }: ImageThumbnailProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Load image
  useState(() => {
    createBlobUrl(attachment, messageId).then(url => {
      if (url) {
        setImageUrl(url);
      } else {
        setHasError(true);
      }
      setIsLoading(false);
    });
  });
  
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = attachment.filename || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return (
      <div className="relative aspect-square w-full max-w-[120px] rounded-lg border bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (hasError || !imageUrl) {
    return (
      <div className="relative aspect-square w-full max-w-[120px] rounded-lg border bg-muted flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Failed to load</p>
      </div>
    );
  }
  
  return (
    <div 
      className="relative aspect-square w-full max-w-[120px] rounded-lg overflow-hidden border bg-muted cursor-pointer group"
      onClick={onClick}
    >
      <img 
        src={imageUrl}
        alt={attachment.filename || 'Attachment'}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={onClick}
          className="p-2 rounded-full bg-background/90 hover:bg-background transition-colors"
          title="View full size"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-full bg-background/90 hover:bg-background transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      
      {/* Filename tooltip on hover */}
      {attachment.filename && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {attachment.filename}
        </div>
      )}
    </div>
  );
};
