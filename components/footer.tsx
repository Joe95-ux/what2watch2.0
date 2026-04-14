"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SocialIcon } from "react-social-icons";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedEmail || !isEmailValid) {
      setStatus("error");
      toast.error("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof result?.error === "string"
            ? result.error
            : "Subscription failed. Please try again.";
        setStatus("error");
        toast.error(message);
        return;
      }

      setStatus("success");
      setEmail("");
      toast.success(
        typeof result?.message === "string"
          ? result.message
          : "Subscribed successfully."
      );
    } catch {
      setStatus("error");
      toast.error("Subscription failed. Please try again.");
    }
  };

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Four-column section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 max-w-7xl mx-auto justify-items-center">
          {/* 1 - Platform */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-lg font-semibold text-foreground mb-4 sm:text-base">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors sm:text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 2 - Discover */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-lg font-semibold text-foreground mb-4 sm:text-base">
              Discover
            </h3>
            <ul className="space-y-2.5">
              {DISCOVER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors sm:text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3 - Useful Links */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-lg font-semibold text-foreground mb-4 sm:text-base">
              Useful Links
            </h3>
            <ul className="space-y-2.5">
              {USEFUL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors sm:text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4 - Newsletter + social */}
          <div className="flex flex-col w-full max-w-xs">
            <h3 className="text-lg font-semibold text-foreground mb-2 sm:text-base">
              Get the latest update
            </h3>
            <p className="text-base text-muted-foreground mb-4 sm:text-sm">
              Subscribe to our newsletter for the latest movie and tv show insights.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3 w-full">
              <div className="flex flex-col gap-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full h-10 text-base sm:h-9 sm:text-sm bg-background"
                  aria-label="Email for newsletter"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-10 text-base sm:h-9 sm:text-sm cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                  disabled={status === "loading" || !normalizedEmail || !isEmailValid}
                >
                  {status === "loading" ? "Submitting…" : "Submit"}
                </Button>
              </div>
              {status === "success" && (
                <p className="text-sm text-green-600 dark:text-green-400 sm:text-xs">
                  Thanks! We&apos;ll be in touch.
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-destructive sm:text-xs">
                  Could not subscribe right now. Please try again.
                </p>
              )}
            </form>
            {/* Social icons */}
            <div className="flex items-center gap-3 mt-6 self-center">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <SocialIcon network="instagram" as="span" style={{ width: 32, height: 32 }} className="!block" />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <SocialIcon network="facebook" as="span" style={{ width: 32, height: 32 }} className="!block" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <SocialIcon network="youtube" as="span" style={{ width: 32, height: 32 }} className="!block" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <Link
            href="https://www.boldwebstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-border rounded-t-[8px] rounded-b-none bg-muted/60 px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span>Built with</span>
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden />
            <span>by Bold Web Studio</span>
          </Link>
        </div>
      </div>

      {/* Bottom bar: Powered by + Copyright */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 border-t">
        <div className="flex flex-col items-center justify-center gap-4 max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground sm:text-xs">
              Powered by (not endorsed)
            </p>
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
                className="h-5 w-auto sm:h-4"
              />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground text-center sm:text-xs">
            &copy; {currentYear} What2Watch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
