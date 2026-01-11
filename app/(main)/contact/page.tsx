"use client";

import { FAQAccordion } from "@/components/landing/faq-accordion";
import { ContactForm } from "@/components/contact/contact-form";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Header Section */}
        <div className="max-w-6xl mx-auto mb-20">
          {/* Contact Us Header */}
          <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
          
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Contact</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* First Section: Contact Info & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto mb-30">
          {/* Left Column: Contact Info */}
          <div className="space-y-6">

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
            <div className="border rounded-lg p-6 bg-transparent">
              <ContactForm />
            </div>
          </div>
        </div>

        {/* Second Section: FAQ */}
        <div className="flex flex-col gap-12 lg:gap-16 max-w-[50rem] mx-auto">
          {/* Left Column: Title & Description */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-center">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-center">
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

