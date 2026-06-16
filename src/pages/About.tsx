import React from "react";
import { Users, Target, Shield, Heart, CheckCircle2 } from "lucide-react";
import imgAboutHero from '../assets/images/img_about_hero.jpg';

export function About() {
  return (
    <div className="w-full">
      {/* About QwikMeal Section */}
      <section className="relative w-full bg-white text-gray-900 pt-12 pb-16 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-red-600 rounded-full blur-3xl opacity-10 -z-10 transform translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Hero Video Banner */}
          <div className="w-full max-w-6xl mx-auto aspect-video rounded-3xl overflow-hidden mb-12 shadow-2xl relative flex items-center justify-center bg-gray-900 border border-black/10">
             <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 z-10 pointer-events-none"></div>
             <video 
               src="https://res.cloudinary.com/dyizr5fqq/video/upload/Title_QwikMeal___The_Last_Sup_scvrzt.mp4"
               poster="https://res.cloudinary.com/dyizr5fqq/video/upload/Title_QwikMeal___The_Last_Sup_scvrzt.jpg"
               autoPlay
               loop
               preload="auto"
               playsInline
               className="absolute inset-0 w-full h-full object-contain z-0 bg-black"
             />
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-6 mt-16 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Delicious Food. Smarter Ordering. Better Experiences.</h2>
            <div className="text-gray-600 text-lg leading-relaxed space-y-6">
              <p>
                At QwikMeal, we believe great food should be convenient, affordable, and accessible to everyone. Our platform connects customers with their favorite restaurants, cloud kitchens, and food brands through a seamless ordering experience designed for speed, savings, and satisfaction.
              </p>
              <p>
                Beyond everyday food ordering, QwikMeal helps businesses, housing societies, schools, and corporate organizations create customized food campaigns, group ordering experiences, and event catering solutions that simplify meal planning for larger groups.
              </p>
            </div>

            <div className="mt-16 text-left bg-gray-50 rounded-2xl p-8 md:p-10 border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Makes QwikMeal Different?</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Exclusive campaign-based offers and discounts",
                  "Faster and more convenient food ordering",
                  "Transparent pricing with clear savings",
                  "Easy reordering and order tracking",
                  "Corporate, community, and event food solutions",
                  "Reliable delivery and customer support"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <CheckCircle2 className="shrink-0 text-red-600 mt-0.5" size={24} />
                    <span className="font-medium text-gray-700 text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              To seamlessly connect corporate teams with curated food brands, transforming everyday meals into engaging, satisfying, and health-conscious experiences. We support the wellness goals of your team—making nutritious and reliable eating as integral to corporate health as a corporate gym membership.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Quality Assured</h3>
              <p className="text-gray-600">We partner only with premium food brands to guarantee the best meals.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Employee Wellness</h3>
              <p className="text-gray-600">Promoting health, fitness, and vitality through balanced, nutritional catering.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Reliability</h3>
              <p className="text-gray-600">Consistent, on-time deliveries that align seamlessly with corporate schedules.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Community</h3>
              <p className="text-gray-600">Fostering workplace engagement by turning lunch into a shared, energizing experience.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
