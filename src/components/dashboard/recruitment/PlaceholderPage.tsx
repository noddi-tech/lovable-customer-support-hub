import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-full p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-foreground">{title}</h1>
        <p className="text-muted-foreground">Denne siden er under utvikling</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
