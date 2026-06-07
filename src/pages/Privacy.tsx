import React from 'react';

export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-gray-500 font-medium mb-8"><strong>Last Updated:</strong> June 2026</p>

          <div className="text-gray-600 space-y-6 leading-relaxed">
            <p>
              Welcome to QwikMeal ("QwikMeal", "we", "our", or "us"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and disclose information when you access or use our website, mobile applications, campaign links, and related services (collectively, the "Services").
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h3>
            
            <h4 className="text-lg font-bold text-gray-900 mt-6 mb-3">Personal Information</h4>
            <p>We may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Full Name</li>
              <li>Mobile Number</li>
              <li>Email Address</li>
              <li>Delivery Address</li>
              <li>Postal/Pincode Information</li>
              <li>Order Details</li>
              <li>Payment Information (processed through secure third-party payment providers)</li>
              <li>Customer Support Communications</li>
            </ul>

            <h4 className="text-lg font-bold text-gray-900 mt-6 mb-3">Automatically Collected Information</h4>
            <p>When you use our Services, we may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>IP Address</li>
              <li>Device Information</li>
              <li>Browser Type</li>
              <li>Operating System</li>
              <li>Location Information (where permitted)</li>
              <li>Website Usage Data</li>
              <li>Cookies and Tracking Information</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Process and fulfill orders</li>
              <li>Validate serviceability based on location or pincode</li>
              <li>Facilitate payments</li>
              <li>Communicate order status updates</li>
              <li>Provide customer support</li>
              <li>Improve our platform and services</li>
              <li>Detect fraud, abuse, or unauthorized activity</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Payment Processing</h3>
            <p>
              QwikMeal does not store your complete payment card details. Payments are securely processed through authorized payment gateway partners. Payment information is subject to the privacy policies of the respective payment service providers.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Sharing of Information</h3>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Restaurant and food brand partners</li>
              <li>Delivery partners</li>
              <li>Payment gateway providers</li>
              <li>Technology service providers</li>
              <li>Government or regulatory authorities when legally required</li>
            </ul>
            <p className="mt-4">We do not sell your personal information to third parties.</p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Cookies</h3>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Maintain user sessions</li>
              <li>Remember preferences</li>
              <li>Analyze website traffic</li>
              <li>Improve user experience</li>
            </ul>
            <p className="mt-4">You may disable cookies through your browser settings; however, some features may not function properly.</p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Data Retention</h3>
            <p>We retain personal information only as long as necessary to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Provide our Services</li>
              <li>Maintain business records</li>
              <li>Resolve disputes</li>
              <li>Comply with applicable laws and regulations</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Data Security</h3>
            <p>
              We implement reasonable technical, administrative, and organizational safeguards to protect your information from unauthorized access, disclosure, alteration, or destruction.
            </p>
            <p>
              However, no method of transmission over the Internet is completely secure, and we cannot guarantee absolute security.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. Your Rights</h3>
            <p>Subject to applicable laws, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of information</li>
              <li>Withdraw consent where applicable</li>
              <li>Raise concerns regarding data processing</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. Third-Party Links</h3>
            <p>
              Our Services may contain links to third-party websites. We are not responsible for the privacy practices or content of such websites.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. Children's Privacy</h3>
            <p>
              Our Services are not directed toward children under the age of 18. We do not knowingly collect personal information from minors.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">11. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. Revised versions will be posted on this page with an updated effective date.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">12. Contact Us</h3>
            <p>For questions regarding this Privacy Policy, please contact:</p>
            <p>
              <strong className="text-gray-900">QwikMeal</strong><br />
              Email: <a href="mailto:Contact@qwikmeal.com" className="text-red-600 hover:text-red-700 font-medium">Contact@qwikmeal.com</a>
            </p>
            <p className="mt-6 italic">
              By using our Services, you consent to the collection and use of information as described in this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
