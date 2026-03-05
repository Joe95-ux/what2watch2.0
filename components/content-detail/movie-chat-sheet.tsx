"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MovieChatSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
}

const SUGGESTIONS = [
  "Tell me about the plot",
  "Who are the main actors?",
  "Where can I watch this?",
  "What are the reviews like?",
  "Is there a sequel?",
  "What's the rating?",
];

export function MovieChatSheet({
  isOpen,
  onOpenChange,
  tmdbId,
  mediaType,
  title,
}: MovieChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(6);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when sheet opens
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, tmdbId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const res = await fetch(
        `/api/ai/chat/movie-details?tmdbId=${tmdbId}&sessionId=${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuestionCount(data.questionCount || 0);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || isLoading) return;

    // Check question limit
    if (questionCount >= maxQuestions) {
      toast.error(`You've reached your limit of ${maxQuestions} questions. Upgrade to Pro for unlimited questions.`);
      return;
    }

    setInput("");
    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = { role: "user", content: messageToSend };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/ai/chat/movie-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          sessionId,
          tmdbId,
          mediaType,
          conversationHistory: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "QUESTION_LIMIT_REACHED") {
          toast.error(data.message);
          setQuestionCount(maxQuestions);
        } else {
          throw new Error(data.error || "Failed to send message");
        }
        return;
      }

      // Add assistant response
      const assistantMessage: Message = { role: "assistant", content: data.message };
      setMessages((prev) => [...prev, assistantMessage]);
      setQuestionCount(data.questionCount || questionCount + 1);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const remainingQuestions = maxQuestions - questionCount;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Ask about {title}</SheetTitle>
            <div className="text-sm text-muted-foreground">
              {remainingQuestions} {remainingQuestions === 1 ? "question" : "questions"} left
            </div>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Ask me anything about {title}</p>
                <p className="text-sm text-muted-foreground">
                  I can tell you about the plot, cast, where to watch, and more!
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="px-6 py-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs h-8 rounded-full cursor-pointer"
                  disabled={isLoading || questionCount >= maxQuestions}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                questionCount >= maxQuestions
                  ? "Upgrade to Pro for more questions"
                  : "Ask a question..."
              }
              disabled={isLoading || questionCount >= maxQuestions}
              className="flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || questionCount >= maxQuestions}
              size="icon"
              className="cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {questionCount >= maxQuestions && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You've reached your question limit. Upgrade to Pro for unlimited questions.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
