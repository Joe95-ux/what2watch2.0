"use client";

import { FAQAccordion } from "@/components/landing/faq-accordion";
import { ContactForm } from "@/components/contact/contact-form";
import { HelpCircle, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* First Section: Contact Info & Form */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto mb-20">
          {/* Left Column: Contact Info */}
          <div className="space-y-6">
            {/* Contact Us Button */}
            <div className="flex items-center gap-3">
              <button className="flex items-center justify-center w-12 h-12 rounded-[25px] border bg-card hover:bg-muted transition-colors">
                <HelpCircle className="h-6 w-6 text-primary" />
              </button>
              <span className="text-lg font-medium">Contact Us</span>
            </div>

            {/* Get in Touch */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Get in Touch</h2>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
              </p>
            </div>

            {/* Info Cards */}
            <div className="space-y-2 mt-6">
              {/* Email Card */}
              <div className="rounded-lg border bg-card px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Email us</div>
                    <div className="text-sm text-muted-foreground">support@what2watch.com</div>
                  </div>
                </div>
                <Link
                  href="mailto:support@what2watch.com"
                  className="rounded-full bg-muted hover:bg-muted/80 p-2 transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Phone Card */}
              <div className="rounded-lg border bg-card px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Call us</div>
                    <div className="text-sm text-muted-foreground">+1 (555) 123-4567</div>
                  </div>
                </div>
                <Link
                  href="tel:+15551234567"
                  className="rounded-full bg-muted hover:bg-muted/80 p-2 transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Location Card */}
              <div className="rounded-lg border bg-card px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Visit us</div>
                    <div className="text-sm text-muted-foreground">123 Main St, City, State 12345</div>
                  </div>
                </div>
                <Link
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-muted hover:bg-muted/80 p-2 transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div>
            <div className="border rounded-lg p-6 bg-card">
              <ContactForm />
            </div>
          </div>
        </div>

        {/* Second Section: FAQ */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* Left Column: Title & Description */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Browse through our FAQ to find quick answers to common questions.
            </p>
          </div>

          {/* Right Column: FAQ Accordion */}
          <div>
            <FAQAccordion />
          </div>
        </div>
      </div>
    </div>
  );
}

