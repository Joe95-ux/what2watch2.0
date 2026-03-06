"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Loader2, History, HelpCircle, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDistanceToNow, format } from "date-fns";
import Image from "next/image";

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
  const { user } = useUser();
  const { data: currentUser } = useCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(6); // Default to 6, will be updated from API
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{
    id: string;
    sessionId: string;
    fullSessionId: string;
    title: string;
    messageCount: number;
    firstMessage: string | null;
    createdAt: string;
    updatedAt: string;
    tmdbId: number;
    mediaType: string;
  }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when sheet opens or sessionId changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, tmdbId, sessionId]);

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
        // Update maxQuestions from API response
        if (data.maxQuestions !== undefined) {
          setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || isLoading) return;

    // Check question limit (skip if unlimited)
    if (maxQuestions !== Infinity && questionCount >= maxQuestions) {
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
          // Update maxQuestions from error response if provided
          if (data.maxQuestions !== undefined) {
            setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
          }
          setQuestionCount(data.questionCount || maxQuestions);
        } else {
          throw new Error(data.error || "Failed to send message");
        }
        return;
      }

      // Add assistant response
      const assistantMessage: Message = { role: "assistant", content: data.message };
      setMessages((prev) => [...prev, assistantMessage]);
      setQuestionCount(data.questionCount || questionCount + 1);
      // Update maxQuestions from API response
      if (data.maxQuestions !== undefined) {
        setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
      }
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

  const loadChatSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/ai/chat/movie-details/sessions?tmdbId=${tmdbId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
      } else {
        toast.error("Failed to load chat history");
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
      toast.error("Failed to load chat history");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleHistoryClick = () => {
    setIsHistoryDialogOpen(true);
    loadChatSessions();
  };

  const handleLoadSession = async (fullSessionId: string, sessionIdPart: string) => {
    // Update the current session ID
    setSessionId(sessionIdPart);
    setIsHistoryDialogOpen(false);
    
    // Reload chat history with the new session
    try {
      const res = await fetch(
        `/api/ai/chat/movie-details?tmdbId=${tmdbId}&sessionId=${sessionIdPart}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuestionCount(data.questionCount || 0);
        if (data.maxQuestions !== undefined) {
          setMaxQuestions(data.maxQuestions === -1 ? Infinity : data.maxQuestions);
        }
        toast.success("Chat session loaded");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load chat session");
    }
  };

  const remainingQuestions = maxQuestions === Infinity ? Infinity : maxQuestions - questionCount;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[30rem] p-0 flex flex-col [&>button]:hidden">
        <SheetHeader className="px-6 py-4 border-b space-y-0">
          {/* Action Row: Quota Notice | History | Close Button */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              {remainingQuestions === Infinity 
                ? "Unlimited questions" 
                : `${remainingQuestions} ${remainingQuestions === 1 ? "question" : "questions"} left`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={handleHistoryClick}
                title="View chat history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => onOpenChange(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Title Row */}
          <SheetTitle className="text-lg font-semibold">Ask about {title}</SheetTitle>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
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
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                      <Image
                        src="/icon1.png"
                        alt="What2Watch"
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  )}
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
                  {message.role === "user" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                      {currentUser?.avatarUrl || user?.imageUrl ? (
                        <Image
                          src={currentUser?.avatarUrl || user?.imageUrl || ""}
                          alt={currentUser?.displayName || user?.firstName || "User"}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {currentUser?.username?.[0]?.toUpperCase() || user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-muted border border-border">
                  <Image
                    src="/icon1.png"
                    alt="What2Watch"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
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
                  disabled={isLoading || (maxQuestions !== Infinity && questionCount >= maxQuestions)}
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
                maxQuestions !== Infinity && questionCount >= maxQuestions
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

      {/* Chat History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chat History for {title}</DialogTitle>
            <DialogDescription>
              Select a previous conversation to continue
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No chat history found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start a conversation to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session.fullSessionId, session.sessionId)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {session.title}
                          </span>
                        </div>
                        {session.firstMessage && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {session.firstMessage}
                            {session.firstMessage.length >= 100 ? "..." : ""}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {session.messageCount} {session.messageCount === 1 ? "message" : "messages"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(session.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
