import React from 'react';

const Hero = () => {
  return (
    <section id="about" className="py-12 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Pay less for butter.
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Instantly see the cheapest price across NZ supermarkets: no noise, just the win.
          </p>
          
          {/* Soft Chips */}
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-100">
              Grouped by brand · size · salt
            </span>
            <span className="px-4 py-2 bg-green-50 text-green-700 text-sm rounded-full border border-green-100">
              Woolworths • Pak'nSave • New World
            </span>
            <span className="px-4 py-2 bg-orange-50 text-orange-700 text-sm rounded-full border border-orange-100">
              Real-time price updates
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
