import React from 'react';
import { useDesignSystem } from '@/contexts/DesignSystemContext';
import { cn } from '@/lib/utils';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ 
  level = 2, 
  as, 
  className, 
  children, 
  ...props 
}) => {
  const { designSystem } = useDesignSystem();
  const Component = as || (`h${level}` as 'h1' | 'h2' | 'h3');
  
  const getHeadingClasses = () => {
    const baseClasses = 'design-system-heading';
    const levelClass = `h${level}`;
    const styleClass = designSystem.components.headings.style;
    
    return cn(baseClasses, levelClass, styleClass, className);
  };
  
  const getHeadingStyles = () => {
    const styles: React.CSSProperties = {
      fontSize: level === 1 ? designSystem.components.headings.h1Size : 
                level === 2 ? designSystem.components.headings.h2Size : 
                designSystem.components.headings.h3Size,
      fontWeight: designSystem.typography.fontWeight[designSystem.components.headings.fontWeight],
    };
    
    if (designSystem.components.headings.style === 'gradient') {
      styles.background = `var(--gradient-primary)`;
      styles.backgroundClip = 'text';
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.color = 'transparent';
    } else {
      styles.color = `hsl(var(--${designSystem.components.headings.colorToken.replace(/([A-Z])/g, '-$1').toLowerCase()}))`;
    }
    
    return styles;
  };

  return (
    <Component
      className={getHeadingClasses()}
      style={getHeadingStyles()}
      {...props}
    >
      {children}
    </Component>
  );
};