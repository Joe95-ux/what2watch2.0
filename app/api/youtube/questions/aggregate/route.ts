import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Aggregate questions into trends
 * POST /api/youtube/questions/aggregate
 * This should be called periodically to process extracted questions
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all questions from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const questions = await db.commentQuestion.findMany({
      where: {
        extractedAt: { gte: thirtyDaysAgo },
      },
    });

    if (questions.length === 0) {
      return NextResponse.json({
        message: "No questions to aggregate",
        trendsCreated: 0,
        trendsUpdated: 0,
      });
    }

    // Normalize and group questions
    const questionGroups = new Map<string, {
      questions: typeof questions;
      normalized: string;
    }>();

    for (const question of questions) {
      const normalized = normalizeQuestion(question.question);
      
      if (!questionGroups.has(normalized)) {
        questionGroups.set(normalized, {
          questions: [],
          normalized,
        });
      }
      
      questionGroups.get(normalized)!.questions.push(question);
    }

    let trendsCreated = 0;
    let trendsUpdated = 0;

    // Process each group
    for (const [normalized, group] of questionGroups.entries()) {
      if (group.questions.length < 2) continue; // Skip single questions

      const frequency = group.questions.length;
      const videos = [...new Set(group.questions.map(q => q.videoId))];
      const avgUpvotes = group.questions.reduce((sum, q) => sum + q.upvotes, 0) / frequency;
      
      // Determine category from most common question type
      const questionTypes = group.questions.map(q => q.questionType).filter(Boolean);
      const mostCommonType = questionTypes.length > 0
        ? questionTypes.sort((a, b) =>
            questionTypes.filter(v => v === a).length -
            questionTypes.filter(v => v === b).length
          )[0]
        : null;

      // Calculate trend score (frequency * avg engagement)
      const trendScore = frequency * (1 + avgUpvotes / 10);

      // Use first question as the representative question
      const representativeQuestion = group.questions[0].question;

      // Check if trend exists
      const existing = await db.questionTrend.findFirst({
        where: {
          normalizedQuestion: normalized,
        },
      });

      if (existing) {
        // Update existing trend
        await db.questionTrend.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + frequency,
            videos: [...new Set([...existing.videos, ...videos])],
            avgUpvotes: (existing.avgUpvotes * existing.frequency + avgUpvotes * frequency) / (existing.frequency + frequency),
            trendScore: existing.trendScore + trendScore,
            lastSeen: new Date(),
            category: mostCommonType || existing.category,
          },
        });
        trendsUpdated++;
      } else {
        // Create new trend
        await db.questionTrend.create({
          data: {
            question: representativeQuestion,
            normalizedQuestion: normalized,
            frequency,
            videos,
            avgUpvotes,
            category: mostCommonType,
            trendScore,
            firstSeen: new Date(),
            lastSeen: new Date(),
          },
        });
        trendsCreated++;
      }
    }

    return NextResponse.json({
      message: "Questions aggregated successfully",
      trendsCreated,
      trendsUpdated,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("Error aggregating questions:", error);
    return NextResponse.json(
      { error: "Failed to aggregate questions" },
      { status: 500 }
    );
  }
}

function normalizeQuestion(question: string): string {
  // Convert to lowercase
  let normalized = question.toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Remove question marks and punctuation at the end
  normalized = normalized.replace(/[?!.,;:]+$/, "");
  
  // Remove common filler words
  normalized = normalized.replace(/\b(please|pls|plz|thx|thanks|thank you)\b/g, "");
  
  // Remove extra spaces again
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}
