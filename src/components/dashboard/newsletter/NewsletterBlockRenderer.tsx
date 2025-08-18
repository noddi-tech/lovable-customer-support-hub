import React from 'react';
import { NewsletterBlock } from '../NewsletterBuilder';

interface NewsletterBlockRendererProps {
  block: NewsletterBlock;
  isDarkMode?: boolean;
}

export const NewsletterBlockRenderer: React.FC<NewsletterBlockRendererProps> = ({
  block,
  isDarkMode = false
}) => {
  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        const TextTag = block.content.tag || 'p';
        return (
          <TextTag 
            style={block.styles}
            dangerouslySetInnerHTML={{ __html: block.content.text }}
          />
        );

      case 'image':
        return (
          <div style={block.styles}>
            {block.content.src ? (
              <img
                src={block.content.src}
                alt={block.content.alt}
                style={{
                  width: block.content.width,
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
                <p>Click to add image</p>
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div style={{ textAlign: block.styles.textAlign || 'left', padding: block.styles.padding }}>
            <a
              href={block.content.href}
              target={block.content.target}
              style={{
                ...block.styles,
                display: 'inline-block',
                textDecoration: 'none'
              }}
            >
              {block.content.text}
            </a>
          </div>
        );

      case 'divider':
        return <hr style={block.styles} />;

      case 'spacer':
        return (
          <div 
            style={{
              ...block.styles,
              height: block.content.height
            }}
          />
        );

      case 'columns':
        return (
          <div style={block.styles}>
            {block.content.columns.map((column: any, index: number) => (
              <div 
                key={index}
                style={{ 
                  width: column.width,
                  flex: column.width === '50%' ? '1' : 'none'
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: column.content }} />
              </div>
            ))}
          </div>
        );

      case 'social':
        return (
          <div style={block.styles}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {block.content.links.map((link: any, index: number) => (
                <a 
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '50%',
                    textDecoration: 'none',
                    color: '#333'
                  }}
                >
                  {link.platform}
                </a>
              ))}
            </div>
          </div>
        );

      case 'product':
        return (
          <div style={{ ...block.styles, border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px' }}>
            {block.content.image && (
              <img 
                src={block.content.image} 
                alt={block.content.title}
                style={{ width: '100%', height: 'auto', marginBottom: '12px' }}
              />
            )}
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
              {block.content.title}
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#666' }}>
              {block.content.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>
                {block.content.price}
              </span>
              <a
                href={block.content.buttonLink}
                style={{
                  backgroundColor: '#007aff',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textDecoration: 'none'
                }}
              >
                {block.content.buttonText}
              </a>
            </div>
          </div>
        );

      case 'ticket':
        return (
          <div style={{ ...block.styles, border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
              {block.content.title}
            </h3>
            {block.content.tickets && block.content.tickets.length > 0 ? (
              <div>
                {block.content.tickets.map((ticket: any, index: number) => (
                  <div key={index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <strong>#{ticket.id}</strong> - {ticket.title}
                    <div style={{ fontSize: '12px', color: '#666' }}>{ticket.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No service tickets to display</p>
            )}
          </div>
        );

      case 'html':
        return (
          <div 
            style={block.styles}
            dangerouslySetInnerHTML={{ __html: block.content.html }}
          />
        );

      default:
        return (
          <div style={block.styles}>
            <p>Unknown block type: {block.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="newsletter-block">
      {renderBlock()}
    </div>
  );
};