import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkIsAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const isAdmin = await checkIsAdmin(userId);
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("[AdminCheck] Error:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
