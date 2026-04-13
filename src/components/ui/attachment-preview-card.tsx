import React, { useState, useEffect } from 'react';
import { Download, Eye, FileText, FileSpreadsheet, File, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailAttachment } from '@/utils/emailFormatting';
import { createBlobUrl } from '@/utils/imageAssetHandler';
import { supabase } from '@/integrations/supabase/client';

type FileCategory = 'image' | 'pdf' | 'spreadsheet' | 'document' | 'other';

const getFileCategory = (mimeType: string | undefined, filename: string): FileCategory => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') ||
      filename?.match(/\.(xlsx?|csv)$/i)) return 'spreadsheet';
  if (mimeType?.includes('document') || mimeType?.includes('word') ||
      filename?.match(/\.(docx?|txt|rtf)$/i)) return 'document';
  return 'other';
};

const CategoryIcon: React.FC<{ category: FileCategory; className?: string }> = ({ category, className = 'h-5 w-5' }) => {
  switch (category) {
    case 'image': return <ImageIcon className={className} />;
    case 'pdf': return <FileText className={`${className} text-red-500`} />;
    case 'spreadsheet': return <FileSpreadsheet className={`${className} text-green-600`} />;
    case 'document': return <FileText className={`${className} text-blue-500`} />;
    default: return <File className={className} />;
  }
};

interface AttachmentPreviewCardProps {
  attachment: EmailAttachment;
  messageId?: string;
  onImageClick?: () => void;
}

export const AttachmentPreviewCard: React.FC<AttachmentPreviewCardProps> = ({
  attachment,
  messageId,
  onImageClick,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const category = getFileCategory(attachment.mimeType, attachment.filename);

  // Load image thumbnail
  useEffect(() => {
    if (category === 'image' && attachment.storageKey) {
      createBlobUrl(attachment, messageId).then(url => {
        if (url) setThumbnailUrl(url);
      });
    }
  }, [attachment.storageKey, category, messageId]);

  const fetchBlob = async (): Promise<Blob | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    if (attachment.storageKey) {
      const response = await fetch(
        `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/get-attachment?key=${encodeURIComponent(attachment.storageKey)}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    }

    // On-demand Gmail fetch
    if (!messageId) return null;
    const response = await fetch(
      `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/fetch-gmail-attachment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE',
        },
        body: JSON.stringify({ messageId, filename: attachment.filename }),
      }
    );
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.recoverable === false) {
        toast({
          title: "Attachment unavailable",
          description: "This file was received via forwarding and can't be fetched on-demand.",
          variant: "destructive",
          duration: 8000,
        });
        return null;
      }
      throw new Error(errData.error || `Failed (${response.status})`);
    }
    return response.blob();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await fetchBlob();
      if (!blob) { setIsDownloading(false); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Download complete", description: attachment.filename });
    } catch (error) {
      console.warn('Download error:', error);
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "Could not download file", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (category === 'image' && onImageClick) {
      onImageClick();
      return;
    }
    if (category === 'pdf') {
      setIsPreviewing(true);
      try {
        const blob = await fetchBlob();
        if (!blob) { setIsPreviewing(false); return; }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.warn('Preview error:', error);
        toast({ title: "Preview failed", description: "Could not open file", variant: "destructive" });
      } finally {
        setIsPreviewing(false);
      }
    }
  };

  const canPreview = category === 'image' || category === 'pdf';
  const sizeLabel = attachment.size >= 1024 * 1024
    ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
    : `${(attachment.size / 1024).toFixed(1)} KB`;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5 hover:bg-muted/50 transition-colors min-w-0">
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {category === 'image' && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={attachment.filename}
            className="w-full h-full object-cover cursor-pointer"
            onClick={onImageClick}
          />
        ) : (
          <CategoryIcon category={category} />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-foreground" title={attachment.filename}>
          {attachment.filename}
        </p>
        <p className="text-[11px] text-muted-foreground">{sizeLabel}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {canPreview && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handlePreview}
            disabled={isPreviewing}
            title={category === 'pdf' ? 'Open PDF' : 'View image'}
          >
            {isPreviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={handleDownload}
          disabled={isDownloading}
          title="Download"
        >
          {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
};
