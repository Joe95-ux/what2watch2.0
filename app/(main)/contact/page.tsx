"use client";

import { FAQAccordion } from "@/components/landing/faq-accordion";
import { ContactForm } from "@/components/contact/contact-form";
import { HelpCircle, MessageSquare, Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question? Browse our FAQ or reach out to us directly. We're here to help!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* FAQ Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Browse through our FAQ to find quick answers to common questions.
            </p>
            <FAQAccordion />
          </div>

          {/* Contact Form Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Get in Touch</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
            </p>
            <div className="border rounded-lg p-6 bg-card">
              <ContactForm />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 pt-12 border-t">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h3 className="text-xl font-semibold">Other Ways to Reach Us</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span>Email us at support@what2watch.com</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              We typically respond within 24-48 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

