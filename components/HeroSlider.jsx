"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const HeroSlider = () => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      // 1. Get list of files in the 'banners' bucket
      const { data, error } = await supabase.storage.from('banners').list();
      
      if (data && !error) {
        // 2. Filter for files that start with "slider-" and sort them (slider-1, slider-2, etc.)
        const validFiles = data
          .filter(file => file.name.startsWith('slider-'))
          .sort((a, b) => a.name.localeCompare(b.name));

        // 3. Convert file names into real Public URLs
        const urls = validFiles.map(file => {
          return supabase.storage.from('banners').getPublicUrl(file.name).data.publicUrl;
        });

        // 4. Update the slider (or use fallback images if nothing is uploaded yet)
        if (urls.length > 0) {
          setImages(urls);
        } else {
          setImages(['/logo.jpg']); // Fallback image
        }
      }
    };

    fetchBanners();
  }, []);

  // Basic auto-slide logic
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
    }, 3000); // Changes image every 3 seconds
    return () => clearInterval(interval);
  }, [images]);

  if (images.length === 0) return <div className="h-48 w-full animate-pulse bg-gray-200"></div>;

  // Inside HeroSlider.jsx, change the return statement to this:
  return (
    <div className="relative h-48 w-full overflow-hidden sm:h-64 bg-gray-900">
      {images.map((imgUrl, index) => (
        <div 
          key={index} 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {/* Blurred Background Layer */}
          <img src={imgUrl} alt="bg" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-md scale-110" />
          
          {/* Crisp Foreground Layer */}
          <img src={imgUrl} alt={`Slider ${index + 1}`} className="relative h-full w-full object-contain drop-shadow-2xl" />
        </div>
      ))}
      
      {/* Slider Dots */}
      <div className="absolute bottom-3 left-0 z-20 flex w-full justify-center gap-2">
        {images.map((_, index) => (
          <div key={index} className={`h-2 rounded-full transition-all ${index === currentIndex ? 'w-4 bg-white' : 'w-2 bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;