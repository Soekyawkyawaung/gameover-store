"use client";

import React from 'react';

const AdBanner = () => {
  return (
    <div className="w-full flex justify-center items-center my-4 overflow-hidden">
      <iframe
        src="/ad-banner.html"
        width="100%"
        height="90"
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        title="Advertisement"
      />
    </div>
  );
};

export default AdBanner;