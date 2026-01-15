import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET - Fetch all active forum categories
export async function GET(request: NextRequest) {
  try {
    const categories = await db.forumCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { order: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        color: true,
        postCount: true,
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching forum categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum categories" },
      { status: 500 }
    );
  }
}

// POST - Create a new forum category (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, slug, description, icon, color, order } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric, hyphens, underscores only)
    if (!/^[a-z0-9-_]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, hyphens, and underscores" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db.forumCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this slug already exists" },
        { status: 400 }
      );
    }

    const admin = await requireAdmin();

    const category = await db.forumCategory.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description?.trim() || null,
        icon: icon || null,
        color: color || null,
        order: order || 0,
        createdById: admin.id,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating forum category:", error);
    return NextResponse.json(
      { error: "Failed to create forum category" },
      { status: 500 }
    );
  }
}

