"use client";
import Link from 'next/link';
import Image from 'next/image';
import {
  Award, CheckCircle, ArrowRight, Heart,
  Mail, Globe, QrCode, Linkedin, FileText,
  Rocket, MessageCircle, ExternalLink
} from 'lucide-react';

// Feature Item Component
function FeatureItem({ children }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Image
              src="/logo.png"
              alt="CertCat Logo"
              width={80}
              height={80}
              quality={100}
              priority
              className="w-10 h-10 rounded-xl"
            />
            <span>CertCat</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-black transition-colors">Home</Link>
            <Link
              href="/dashboard"
              className="bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            100% Free, Forever
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            CertCat is completely free for everyone. No hidden fees, no premium tiers, no surprises.
          </p>
        </div>
      </section>

      {/* Free Plan Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-gray-100 p-8 md:p-12 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Plan Details */}
              <div>
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6">
                  <Heart className="w-4 h-4" />
                  <span className="font-medium">Forever Free</span>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-extrabold">$0</span>
                  <span className="text-gray-500">/forever</span>
                </div>

                <ul className="space-y-4 mb-8">
                  <FeatureItem>Up to 50 certificates per month</FeatureItem>
                  <FeatureItem>Custom certificate designs</FeatureItem>
                  <FeatureItem>Drag-and-drop editor</FeatureItem>
                  <FeatureItem>QR code verification</FeatureItem>
                  <FeatureItem>LinkedIn integration</FeatureItem>
                  <FeatureItem>Email delivery</FeatureItem>
                  <FeatureItem>Cloud-hosted certificates</FeatureItem>
                  <FeatureItem>CSV bulk import</FeatureItem>
                </ul>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
                >
                  <Rocket size={20} /> Get Started Free
                </Link>
              </div>

              {/* Visual Elements */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-3xl blur-3xl opacity-20" />
                  <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: FileText, label: 'Templates', value: 'Unlimited' },
                        { icon: Award, label: 'Recipients', value: '50/mo' },
                        { icon: QrCode, label: 'QR Codes', value: 'Included' },
                        { icon: Globe, label: 'Hosting', value: 'Free CDN' },
                        { icon: Mail, label: 'Emails', value: 'Auto-send' },
                        { icon: Linkedin, label: 'LinkedIn', value: 'Integrated' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl text-center">
                          <item.icon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className="font-bold text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-orange-500" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-4">Need More?</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Have questions, need custom features, or want to discuss enterprise solutions?
              I'd love to hear from you!
            </p>

            <a
              href="https://reyandev.com/Contact/contact.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
            >
              <Mail size={20} /> Contact Me <ExternalLink size={16} />
            </a>

            <p className="text-sm text-gray-400 mt-6">
              Whether it's feature requests, bug reports, or collaboration opportunities — reach out anytime.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'Is CertCat really free?',
                a: 'Yes! CertCat is completely free for up to 50 certificates per month. No credit card required, no hidden fees. I believe everyone should have access to professional certification tools.',
              },
              {
                q: 'What happens if I need more than 50 certificates?',
                a: 'Contact me! I\'m happy to discuss your needs and find a solution that works for you.',
              },
              {
                q: 'Can I use my own certificate designs?',
                a: 'Absolutely! Upload any design from Figma, Canva, or any design tool. The drag-and-drop editor lets you position text and QR codes exactly where you want them.',
              },
              {
                q: 'Are certificates hosted permanently?',
                a: 'Yes, all certificates are hosted on a global CDN and accessible via unique verification URLs. Recipients can access and verify their certificates anytime.',
              },
              {
                q: 'Who built CertCat?',
                a: 'CertCat is built and maintained by a solo developer passionate about making certificate generation accessible to everyone.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-gray-50 rounded-2xl">
                <h3 className="font-bold text-lg mb-2">{item.q}</h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to create certificates?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Start creating professional certificates in minutes. It's free!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-orange-500 text-white text-lg font-bold px-8 py-4 rounded-full hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              Start Free <ArrowRight size={20} />
            </Link>
            <a
              href="https://reyandev.com/Contact/contact.html"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white text-lg font-bold px-8 py-4 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center gap-2 border border-white/20"
            >
              <MessageCircle size={20} /> Contact Me
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <Image
              src="/logo.png"
              alt="CertCat Logo"
              width={64}
              height={64}
              quality={100}
              className="w-8 h-8 rounded-lg"
            />
            <span>CertCat</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-black">Home</Link>
            <Link href="/dashboard" className="hover:text-black">Dashboard</Link>
            <a
              href="https://reyandev.com/Contact/contact.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black"
            >
              Contact
            </a>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} CertCat
          </p>
        </div>
      </footer>
    </div>
  );
}
