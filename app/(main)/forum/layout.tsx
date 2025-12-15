import { ForumLayout } from "@/components/forum/forum-layout";

export default function ForumLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForumLayout>{children}</ForumLayout>;
}

