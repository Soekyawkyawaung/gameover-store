import React, { useState } from 'react';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import Checkout from '../components/Checkout';

export default function Home() {
  // This state controls whether we show the store or the checkout page
  const [showCheckout, setShowCheckout] = useState(false);

  // A dummy list of games for your storefront
  const games = [
    { id: 1, title: 'Grand Theft Auto V (PS5)', price: '75,000 MMK', img: '/banners/gta6.jpg' },
    { id: 2, title: 'Spider-Man 2 (PS5)', price: '120,000 MMK', img: '/banners/spiderman.jpg' },
    { id: 3, title: 'EA Sports FC 25', price: '140,000 MMK', img: '/banners/fc25.jpg' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-10 shadow-lg">
      {/* The Header is always visible at the top */}
      <Header />

      {/* If showCheckout is TRUE, show the Checkout page. Otherwise, show the Storefront. */}
      {showCheckout ? (
        <div>
          <button 
            onClick={() => setShowCheckout(false)}
            className="m-4 text-sm font-bold text-blue-600"
          >
            ← Back to Store
          </button>
          <Checkout />
        </div>
      ) : (
        <div>
          {/* 1. Hero Image Slider */}
          <HeroSlider />

          {/* 2. Game Catalog */}
          <div className="px-4 mt-6">
            <h2 className="mb-4 text-lg font-bold text-gray-800">Trending Now</h2>
            
            <div className="flex flex-col gap-4">
              {games.map((game) => (
                <div key={game.id} className="flex overflow-hidden rounded-lg border shadow-sm">
                  {/* Game Image Placeholder (reusing banner images for now) */}
                  <div className="w-1/3 bg-gray-200">
                    <img src={game.img} alt={game.title} className="h-full w-full object-cover" />
                  </div>
                  
                  {/* Game Info & Buy Button */}
                  <div className="flex w-2/3 flex-col justify-between p-3">
                    <div>
                      <h3 className="text-sm font-bold leading-tight text-gray-900">{game.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-red-600">{game.price}</p>
                    </div>
                    <button 
                      onClick={() => setShowCheckout(true)}
                      className="mt-3 w-full rounded bg-black py-1.5 text-xs font-bold text-white hover:bg-gray-800"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}