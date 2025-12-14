/**
 * Script to seed forum categories
 * 
 * Usage:
 *   npx tsx scripts/seed-forum-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CategoryData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

const categories: CategoryData[] = [
  // Core Content Discussion
  {
    name: "Movies",
    slug: "movies",
    description: "Discuss movies, share recommendations, and talk about your favorites",
    icon: "🎬",
    color: "#3B82F6",
    order: 1,
  },
  {
    name: "TV Shows",
    slug: "tv-shows",
    description: "Talk about TV series, episodes, and binge-worthy shows",
    icon: "📺",
    color: "#10B981",
    order: 2,
  },
  {
    name: "Nollywood",
    slug: "nollywood",
    description: "Nigerian cinema and TV shows discussion",
    icon: "🎭",
    color: "#F59E0B",
    order: 3,
  },
  // Community Features
  {
    name: "Recommendations",
    slug: "recommendations",
    description: "Share and discover what to watch next",
    icon: "💡",
    color: "#8B5CF6",
    order: 4,
  },
  {
    name: "Reviews & Ratings",
    slug: "reviews-ratings",
    description: "Share detailed reviews and discuss ratings",
    icon: "⭐",
    color: "#EC4899",
    order: 5,
  },
  {
    name: "Watchlists",
    slug: "watchlists",
    description: "Share your watchlists and get suggestions",
    icon: "📋",
    color: "#06B6D4",
    order: 6,
  },
  {
    name: "Playlists & Lists",
    slug: "playlists-lists",
    description: "Discuss curated playlists and themed lists",
    icon: "📝",
    color: "#84CC16",
    order: 7,
  },
  // General Discussion
  {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General movie and TV show discussions",
    icon: "💬",
    color: "#6B7280",
    order: 8,
  },
  {
    name: "News & Updates",
    slug: "news-updates",
    description: "Latest news, trailers, and industry updates",
    icon: "📰",
    color: "#EF4444",
    order: 9,
  },
  {
    name: "Theories & Speculation",
    slug: "theories-speculation",
    description: "Fan theories, predictions, and speculation",
    icon: "🔮",
    color: "#A855F7",
    order: 10,
  },
  // Support & Community
  {
    name: "Help & Support",
    slug: "help-support",
    description: "Get help with the app and features",
    icon: "❓",
    color: "#F97316",
    order: 11,
  },
  {
    name: "Feature Requests",
    slug: "feature-requests",
    description: "Suggest new features and improvements",
    icon: "💡",
    color: "#14B8A6",
    order: 12,
  },
  {
    name: "Introductions",
    slug: "introductions",
    description: "Introduce yourself to the community",
    icon: "👋",
    color: "#6366F1",
    order: 13,
  },
  // Genre-Specific
  {
    name: "Horror",
    slug: "horror",
    description: "Discuss horror movies and TV shows",
    icon: "👻",
    color: "#1F2937",
    order: 14,
  },
  {
    name: "Comedy",
    slug: "comedy",
    description: "Share laughs and discuss comedy content",
    icon: "😂",
    color: "#FBBF24",
    order: 15,
  },
  {
    name: "Action & Thriller",
    slug: "action-thriller",
    description: "High-octane action and thrilling content",
    icon: "💥",
    color: "#DC2626",
    order: 16,
  },
  {
    name: "Drama",
    slug: "drama",
    description: "Discuss dramatic films and series",
    icon: "🎭",
    color: "#7C3AED",
    order: 17,
  },
  {
    name: "Sci-Fi & Fantasy",
    slug: "sci-fi-fantasy",
    description: "Explore sci-fi and fantasy worlds",
    icon: "🚀",
    color: "#0891B2",
    order: 18,
  },
  // Regional Content
  {
    name: "International Cinema",
    slug: "international-cinema",
    description: "Discuss films and shows from around the world",
    icon: "🌍",
    color: "#059669",
    order: 19,
  },
];

async function seedCategories() {
  console.log("🌱 Starting to seed forum categories...\n");

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const category of categories) {
    try {
      // Check if category already exists
      const existing = await prisma.forumCategory.findUnique({
        where: { slug: category.slug },
      });

      if (existing) {
        console.log(`⏭️  Skipping "${category.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create the category
      await prisma.forumCategory.create({
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          color: category.color,
          order: category.order,
          isActive: true,
        },
      });

      console.log(`✅ Created "${category.name}" (${category.icon})`);
      created++;
    } catch (error: any) {
      console.error(`❌ Error creating "${category.name}":`, error.message);
      errors++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${categories.length}`);

  if (errors > 0) {
    process.exit(1);
  }
}

seedCategories()
  .catch((error) => {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

