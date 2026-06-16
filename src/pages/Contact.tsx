import React, { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    mobileNumber: "",
    subject: "Food Order & Delivery Related Enquiries",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Save to Firestore
      await addDoc(collection(db, "contactEnquiries"), {
        ...formData,
        createdAt: serverTimestamp(),
        read: false
      });

      // 2. Trigger Email via API (don't block UI if this part fails)
      fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      }).catch(err => console.error("Error triggering email webhook:", err));

      setSubmitted(true);
      setFormData({ name: "", companyName: "", email: "", mobileNumber: "", subject: "Food Order & Delivery Related Enquiries", message: "" });
      setTimeout(() => setSubmitted(false), 8000);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert("There was an error submitting your enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="relative w-full bg-white text-gray-900 pt-20 pb-16 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-10 -z-10 transform translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-gray-900">
            Get in Touch
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Have questions about our corporate food engagement platform? We'd love to hear from you. Reach out to us below.
          </p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Email Us</p>
                      <a href="mailto:Contact@qwikmeal.com" className="text-gray-600 hover:text-red-600 transition-colors">
                        Contact@qwikmeal.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Call Us</p>
                      <p className="text-gray-600">
                        +91 8800004656<br />
                        <span className="text-sm">Mon-Fri, 9am - 6pm</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Office Location</p>
                      <p className="text-gray-600 leading-relaxed">
                        QwikMeal LLC,<br />
                        3rd Floor, Orchid Centre, Sector 53,<br />
                        Gurugram, Haryana 122022
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h3>
                
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={28} />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Message Sent Successfully!</h4>
                    <p className="text-green-700">
                      Thank you for contacting QwikMeal. Our team has received your enquiry and will get back to you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                          Company Name
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                          placeholder="Ex: Acme Corp"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                          placeholder="john@company.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                          Contact Number *
                        </label>
                        <input
                          type="tel"
                          id="mobileNumber"
                          required
                          value={formData.mobileNumber}
                          onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject *
                      </label>
                      <select
                        id="subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                      >
                        <option value="Food Order & Delivery Related Enquiries">Food Order & Delivery Related Enquiries</option>
                        <option value="General Enquiry">General Enquiry</option>
                        <option value="Corporate Catering">Corporate Catering</option>
                        <option value="Partnership Request">Partnership Request</option>
                        <option value="Franchise Enquiry">Franchise Enquiry</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Feedback">Feedback</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message / Enquiry *
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-8 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send size={18} />
                      )}
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}
