import { useState, useCallback } from 'react';

export function useImageLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const open = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  const next = useCallback((totalImages: number) => {
    setCurrentIndex((prev) => (prev + 1) % totalImages);
  }, []);
  
  const previous = useCallback((totalImages: number) => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, []);
  
  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);
  
  return {
    isOpen,
    currentIndex,
    open,
    close,
    next,
    previous,
    goTo,
  };
}
