import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET - Fetch all forum categories (admin only, includes inactive)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      db.forumCategory.findMany({
        orderBy: [
          { order: "asc" },
          { name: "asc" },
        ],
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      db.forumCategory.count(),
    ]);

    // Format response with actual post counts
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      order: category.order,
      isActive: category.isActive,
      postCount: category._count.posts, // Use actual count instead of cached
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return NextResponse.json({
      categories: formattedCategories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching forum categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum categories" },
      { status: 500 }
    );
  }
}

