import React from 'react';

const DoormanInterface = () => {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://doorman.noddi.co/"
        className="w-full h-full border-0"
        title="Doorman Service"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};

export default DoormanInterface;