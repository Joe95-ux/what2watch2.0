"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "What is What2Watch?",
    answer: "What2Watch is a personal watchlist companion that helps you discover, organize, and share your favorite movies and TV shows. With AI-powered recommendations and a vibrant community, you'll never run out of great content to watch.",
  },
  {
    question: "How do I create a playlist?",
    answer: "Creating a playlist is easy! Simply browse our library, find movies or TV shows you want to save, and click the 'Add to Playlist' button. You can create multiple playlists for different moods, genres, or occasions. Playlists can be private or shared publicly with the community.",
  },
  {
    question: "Is What2Watch free to use?",
    answer: "Yes! What2Watch is completely free to use. Sign up with your account to start creating playlists, discovering content, and connecting with other film enthusiasts. No credit card required.",
  },
  {
    question: "How does the recommendation system work?",
    answer: "Our recommendation system uses your viewing preferences, favorite genres, and ratings to suggest content you'll love. The more you interact with the platform—rating movies, creating playlists, and exploring content—the better our recommendations become.",
  },
  {
    question: "Can I share my playlists with others?",
    answer: "Absolutely! When creating a playlist, you can choose to make it public. Public playlists are visible to the entire What2Watch community, allowing others to discover and enjoy your curated collections. You can also share direct links to your playlists.",
  },
  {
    question: "What data sources does What2Watch use?",
    answer: "What2Watch is powered by The Movie Database (TMDB) API, which provides comprehensive and up-to-date information about movies and TV shows, including ratings, cast, crew, trailers, and more. This ensures you have access to accurate and current entertainment data.",
  },
];

export function FAQAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {faqData.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`item-${index}`}
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left font-semibold hover:no-underline">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

