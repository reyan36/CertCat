"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle, Upload, Users, Zap, Shield, Globe,
  ArrowRight, Play, Linkedin, Mail, QrCode, Sparkles,
  FileText, MousePointer, Send, ChevronRight, Star
} from 'lucide-react';

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let start = 0;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={countRef}>{count.toLocaleString()}{suffix}</span>;
}

// Feature card with hover effect
function FeatureCard({ icon: Icon, title, description, delay }) {
  return (
    <div
      className={`group p-8 bg-white rounded-2xl border border-gray-100 hover-lift cursor-default animate-slide-up opacity-0`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-300">
        <Icon className="w-7 h-7 text-orange-500 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-3 group-hover:text-orange-500 transition-colors">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// Step card for how it works
function StepCard({ number, title, description, icon: Icon }) {
  return (
    <div className="relative flex gap-6 items-start">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-200">
        {number}
      </div>
      <div className="flex-1 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// Testimonial card
function TestimonialCard({ quote, author, role, company }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 hover-lift">
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
        ))}
      </div>
      <p className="text-gray-600 mb-6 leading-relaxed">"{quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-bold">{author}</p>
          <p className="text-sm text-gray-500">{role}, {company}</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isVisible, setIsVisible] = useState({});

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
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
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-black transition-colors">How it works</a>
            <Link href="/pricing" className="text-gray-600 hover:text-black transition-colors">Pricing</Link>
          </div>
          <Link
            href="/dashboard"
            className="bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 grid-pattern">
        {/* Decorative elements */}
        <div className="absolute top-40 left-10 w-72 h-72 bg-orange-200 rounded-full blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-40 animate-float-slow" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-full mb-8 animate-slide-up">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">Trusted by 500+ organizations</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up delay-100" style={{ animationFillMode: 'forwards', opacity: 0 }}>
              Beautiful Certificates
              <br />
              <span className="gradient-text">Delivered Instantly</span>
            </h1>

            <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto animate-slide-up delay-200" style={{ animationFillMode: 'forwards', opacity: 0 }}>
              Create stunning, verifiable certificates in minutes. Upload your design, import your participants, and let CertCat handle the rest.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up delay-300" style={{ animationFillMode: 'forwards', opacity: 0 }}>
              <Link
                href="/dashboard"
                className="bg-orange-500 text-white text-lg font-bold px-8 py-4 rounded-full hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300 flex items-center justify-center gap-2 animate-pulse-glow"
              >
                Start Creating Free <ArrowRight size={20} />
              </Link>
              <a
                href="#how-it-works"
                className="bg-white text-black text-lg font-bold px-8 py-4 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
              >
                <Play size={20} className="text-orange-500" /> See how it works
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-slide-up delay-400" style={{ animationFillMode: 'forwards', opacity: 0 }}>
              <div>
                <p className="text-4xl font-bold gradient-text"><AnimatedCounter end={10000} suffix="+" /></p>
                <p className="text-gray-500 text-sm mt-1">Certificates Issued</p>
              </div>
              <div>
                <p className="text-4xl font-bold gradient-text"><AnimatedCounter end={500} suffix="+" /></p>
                <p className="text-gray-500 text-sm mt-1">Organizations</p>
              </div>
              <div>
                <p className="text-4xl font-bold gradient-text"><AnimatedCounter end={99} suffix="%" /></p>
                <p className="text-gray-500 text-sm mt-1">Delivery Rate</p>
              </div>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-20 relative animate-scale-in delay-500" style={{ animationFillMode: 'forwards', opacity: 0 }}>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-4 shadow-2xl border border-gray-200">
              <div className="bg-white rounded-2xl overflow-hidden shadow-inner">
                {/* Mock certificate preview */}
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-white p-8 relative">
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Certificate of Achievement</p>
                      <p className="text-3xl font-bold text-gray-800 mb-1">John Doe</p>
                      <p className="text-gray-500">has successfully completed</p>
                      <p className="text-lg font-semibold text-orange-500 mt-2">Advanced Web Development Bootcamp</p>
                      <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <QrCode className="w-10 h-10 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-gray-50" data-animate>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-500 font-semibold mb-4">FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need to certify</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Powerful features to create, send, and manage certificates at scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Upload}
              title="Custom Designs"
              description="Upload your own certificate designs from Figma, Canva, or any design tool. Full creative control."
              delay={0}
            />
            <FeatureCard
              icon={Shield}
              title="Secure Verification"
              description="Each certificate gets a unique QR code and verification URL. Instantly verifiable by anyone."
              delay={100}
            />
            <FeatureCard
              icon={Linkedin}
              title="LinkedIn Ready"
              description="Recipients can add credentials to LinkedIn with one click. Boost their professional profile."
              delay={200}
            />
            <FeatureCard
              icon={Mail}
              title="Auto Email Delivery"
              description="Certificates are automatically emailed to recipients with beautiful, professional templates."
              delay={300}
            />
            <FeatureCard
              icon={Users}
              title="Bulk Processing"
              description="Upload a CSV with hundreds of names. We process and deliver all certificates instantly."
              delay={400}
            />
            <FeatureCard
              icon={Globe}
              title="Cloud Hosted"
              description="All certificates are hosted on our global CDN. Fast, reliable access from anywhere."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6" data-animate>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-orange-500 font-semibold mb-4">HOW IT WORKS</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Three simple steps</h2>
              <p className="text-xl text-gray-500 mb-12">
                From design to delivery in minutes. No technical skills required.
              </p>

              <div className="space-y-10">
                <StepCard
                  number="1"
                  icon={FileText}
                  title="Upload Your Design"
                  description="Drop in your certificate template. We support PNG, JPG, and PDF formats."
                />
                <StepCard
                  number="2"
                  icon={MousePointer}
                  title="Add Dynamic Fields"
                  description="Position name, date, and QR code placeholders exactly where you want them."
                />
                <StepCard
                  number="3"
                  icon={Send}
                  title="Import & Send"
                  description="Upload your participant list and hit send. We handle everything else."
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl blur-2xl opacity-20" />
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
                <div className="space-y-6">
                  {/* Mock UI elements */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Template uploaded</p>
                      <p className="text-sm text-gray-500">certificate-design.png</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Fields configured</p>
                      <p className="text-sm text-gray-500">Name, Date, QR Code</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center animate-pulse">
                      <Zap className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Sending certificates...</p>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div className="bg-orange-500 h-2 rounded-full w-3/4 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">127 of 150 sent</span>
                      <span className="text-green-600 font-semibold">85% complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6 bg-gray-50" data-animate>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-500 font-semibold mb-4">TESTIMONIALS</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Loved by organizations</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              See what our users have to say about CertCat.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="CertCat saved us hours of work. We used to manually create and email each certificate. Now it's completely automated."
              author="Sarah Chen"
              role="Training Director"
              company="TechCorp Academy"
            />
            <TestimonialCard
              quote="The verification feature is a game-changer. Employers can instantly verify our certificates with a QR scan."
              author="Michael Torres"
              role="Program Manager"
              company="Skills Institute"
            />
            <TestimonialCard
              quote="Beautiful, professional certificates that our participants love to share on LinkedIn. Highly recommended!"
              author="Emily Johnson"
              role="Event Coordinator"
              company="Global Workshops"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6" data-animate>
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-12 md:p-16 text-center text-white overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to get started?</h2>
              <p className="text-xl text-orange-100 mb-10 max-w-xl mx-auto">
                Join hundreds of organizations using CertCat to streamline their certification process.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="bg-white text-orange-600 text-lg font-bold px-8 py-4 rounded-full hover:bg-orange-50 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  Start Free Today <ChevronRight size={20} />
                </Link>
                <Link
                  href="/pricing"
                  className="bg-transparent border-2 border-white text-white text-lg font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-xl">
              <Image
                src="/logo.png"
                alt="CertCat Logo"
                width={80}
                height={80}
                quality={100}
                className="w-10 h-10 rounded-xl"
              />
              <span>CertCat</span>
            </div>
            <div className="flex items-center gap-8 text-gray-500">
              <Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link>
              <Link href="/dashboard" className="hover:text-black transition-colors">Dashboard</Link>
              <a href="mailto:support@certcat.com" className="hover:text-black transition-colors">Contact</a>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} CertCat. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
