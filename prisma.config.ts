// prisma.config.ts
import 'dotenv/config'; // Required in v7 to load .env for the CLI
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Path to your main schema file
  schema: 'prisma/schema.prisma',

  // Migration settings
  migrations: {
    path: 'prisma/migrations',
    // Optional: custom seed script
    seed: 'tsx prisma/seed.ts', 
  },

  // Connection URL (no longer in schema.prisma)
  datasource: {
    url: env('DATABASE_URL'),
  },
});
