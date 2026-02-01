"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SocialIcon } from "react-social-icons";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLATFORM_LINKS = [
  { href: "/dashboard/diary", label: "Diary" },
  { href: "/dashboard/watchlist", label: "Watchlist" },
  { href: "/forum", label: "Forums" },
  { href: "/lists", label: "Lists" },
];

const DISCOVER_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/browse/personalized", label: "Guide" },
];

const USEFUL_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    // TODO: Hook up with Mailchimp later
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 500);
  };

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Four-column section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 max-w-7xl mx-auto justify-items-center items-center">
          {/* 1 - Platform */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 2 - Discover */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-4">Discover</h3>
            <ul className="space-y-2.5">
              {DISCOVER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3 - Useful Links */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-4">Useful Links</h3>
            <ul className="space-y-2.5">
              {USEFUL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4 - Newsletter + social */}
          <div className="flex flex-col items-center text-center w-full max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Get the latest update
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Subscribe to our newsletter for the latest movie and tv show insights.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3 w-full">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  className="flex-1 min-w-0 h-9 bg-background"
                  aria-label="Email for newsletter"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer"
                  disabled={status === "loading" || !email.trim()}
                >
                  {status === "loading" ? "Submitting…" : "Submit"}
                </Button>
              </div>
              {status === "success" && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Thanks! We&apos;ll be in touch.
                </p>
              )}
            </form>
            {/* Social icons */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <SocialIcon network="instagram" as="span" style={{ width: 24, height: 24 }} className="!block" />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <SocialIcon network="facebook" as="span" style={{ width: 24, height: 24 }} className="!block" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <SocialIcon network="youtube" as="span" style={{ width: 24, height: 24 }} className="!block" />
              </a>
              <a
                href="mailto:hello@what2watch.net"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar: Powered by + Copyright */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 border-t">
        <div className="flex flex-col items-center justify-center gap-4 max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Powered by (not endorsed)</p>
            <Link
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/moviedb-logo2.svg"
                alt="The Movie Database"
                width={80}
                height={16}
                className="h-4 w-auto"
              />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} What2Watch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
