import { PrismaClient } from '@prisma/client';
import { db } from '../lib/db';

// Import the slug generation function directly
function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueForumPostSlug(title: string, excludePostId?: string): Promise<string> {
  const base = sanitizeSlug(title);
  const fallbackBase = base || "post";

  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? fallbackBase : `${fallbackBase}-${attempt}`;

    const existing = await db.forumPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludePostId) {
      return candidate;
    }

    attempt += 1;
  }

  // As a last resort, append a timestamp
  return `${fallbackBase}-${Date.now()}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to backfill forum post slugs...');

  // Find all posts - we'll check each one
  const allPosts = await prisma.forumPost.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  // Filter posts that need slugs (null, empty, or invalid)
  const postsWithoutSlugs = allPosts.filter(post => 
    !post.slug || post.slug.trim() === '' || post.slug.length === 0
  );

  console.log(`Found ${postsWithoutSlugs.length} posts without slugs`);

  for (const post of postsWithoutSlugs) {
    try {
      const newSlug = await generateUniqueForumPostSlug(post.title, post.id);
      
      await prisma.forumPost.update({
        where: { id: post.id },
        data: { slug: newSlug },
      });

      console.log(`✓ Updated post "${post.title.substring(0, 50)}..." with slug: ${newSlug}`);
    } catch (error) {
      console.error(`✗ Failed to update post ${post.id}:`, error);
    }
  }

  console.log('Finished backfilling forum post slugs');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

