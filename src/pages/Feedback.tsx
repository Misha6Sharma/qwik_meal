import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Feedback() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="fill-current w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
        <p className="text-gray-500">Your feedback helps us improve your meal experience.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 w-full">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rate your QwikMeal</h2>
          <p className="text-gray-500">Order #QM-9824 • Delivered Today at 1:15 PM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  size={40}
                  className={`${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-100 text-gray-200'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Any comments for the chef?
            </label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none resize-none"
              placeholder="Tell us about the taste, packaging, or delivery..."
            />
          </div>

          <button
            type="submit"
            disabled={rating === 0}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              rating > 0
                ? 'bg-red-600 text-white shadow-md hover:bg-red-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}
