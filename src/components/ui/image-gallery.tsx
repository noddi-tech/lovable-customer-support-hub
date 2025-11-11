import { EmailAttachment } from '@/utils/emailFormatting';
import { ImageThumbnail } from './image-thumbnail';

interface ImageGalleryProps {
  images: EmailAttachment[];
  messageId?: string;
  onImageClick: (index: number) => void;
}

export const ImageGallery = ({ images, messageId, onImageClick }: ImageGalleryProps) => {
  if (images.length === 0) return null;
  
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-muted-foreground">
        {images.length} {images.length === 1 ? 'image' : 'images'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image, index) => (
          <ImageThumbnail
            key={image.attachmentId || index}
            attachment={image}
            messageId={messageId}
            onClick={() => onImageClick(index)}
          />
        ))}
      </div>
    </div>
  );
};
