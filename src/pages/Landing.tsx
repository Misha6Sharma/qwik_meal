import React, { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Clock, Heart, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { getBrands } from "../brands";
import { Brand } from "../types";

export function Landing() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    getBrands().then(b => setBrands(b.filter((br) => br.isActive !== false)));
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full flex items-center justify-center text-center overflow-hidden min-h-[80vh]">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full z-0 before:absolute before:inset-0 before:bg-black/30 before:z-10">
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(1.3) contrast(1.1)' }}
            autoPlay 
            muted 
            loop 
            playsInline
            src="/hero-video.mp4"
            poster="https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2670&auto=format&fit=crop"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white mb-6 drop-shadow-lg">
            Elevate Your Workplace Food Experience.
          </h1>
          <p className="text-white text-lg md:text-xl max-w-3xl font-medium leading-relaxed mb-10 drop-shadow-md">
            At Qwik Meal, we connect your workplace with a curated selection of top tier food brands through seamlessly executed meal campaigns.
          </p>
          <div className="flex flex-col gap-5 sm:flex-row items-center justify-center drop-shadow-md">
            <Link to="/auth" className="bg-red-600 text-white px-10 py-4 rounded-full font-bold inline-flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 text-lg">
              Order Now <ArrowRight size={24} />
            </Link>
            <span className="text-sm font-medium text-gray-300">
              Trusted by leading corporates
            </span>
          </div>
        </div>
      </section>

      {/* Associated Brands Section */}
      <section className="py-12 bg-white border-b border-gray-100 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <p className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-8">Our Associated Food Brands</p>
           <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
              {brands.map(brand => (
                <div key={brand.id} className="flex flex-col items-center justify-center p-4 hover:scale-105 transition-transform gap-3">
                  <img 
                     src={brand.logo || undefined} 
                     alt={`${brand.name} logo`} 
                     referrerPolicy="no-referrer"
                     className="max-h-12 w-auto object-contain drop-shadow-sm"
                  />
                  <span className="font-bold text-gray-600 hover:text-red-600 text-lg md:text-xl tracking-tighter transition-colors">
                     {brand.name}
                  </span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Campaign Dishes Section */}
      <section className="py-20 bg-gray-50 text-center border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-sm font-bold tracking-widest text-red-600 uppercase mb-4">Your Campaign Dishes</h2>
           <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Sign in to unlock your campaign menu</h3>
           <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10">
             Your homepage dishes will come from your active campaign after login.
           </p>
           <Link to="/auth" className="border-2 border-red-600 text-red-600 px-8 py-3 rounded-full font-bold hover:bg-red-600 hover:text-white transition-colors inline-block">
              Log in to view menu
           </Link>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-sm font-bold tracking-widest text-red-600 uppercase">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">The QwikMeal Difference</h2>
            <p className="text-gray-600 text-lg">We bring quality food, seamless ordering, and curated campaigns right to your workplace.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Quality Assured</h3>
              <p className="text-gray-600 leading-relaxed">Every brand on our platform is vetted for quality, hygiene, and reliability.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-yellow-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-400 group-hover:text-gray-900 transition-colors">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">On-Time Delivery</h3>
              <p className="text-gray-600 leading-relaxed">Campaigns are planned and executed so your team gets food when it's needed.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Heart size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Employee Delight</h3>
              <p className="text-gray-600 leading-relaxed">Diverse menus and brands keep employees excited, satisfied, and energised.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <Leaf size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Healthy Options</h3>
              <p className="text-gray-600 leading-relaxed">Curated dishes balanced for taste and nutrition so your team eats well.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
