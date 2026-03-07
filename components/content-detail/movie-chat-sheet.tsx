"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Loader2, History, HelpCircle, Clock, Copy, Check, SquarePen, Trash2 } from "lucide-react";
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
import { containsProfanity, sanitizeHtml } from "@/lib/moderation";

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
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Load chat history when sheet opens or sessionId changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
      shouldAutoScroll.current = true;
      // Scroll to bottom when sheet opens
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
          if (viewport) {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "auto",
            });
          }
        }
      }, 200);
    }
  }, [isOpen, tmdbId, sessionId]);

  // Scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (shouldAutoScroll.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
      if (viewport) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [messages, isLoading]);

  // Attach scroll listener to detect if user is near bottom
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // If user is within 100px of bottom, enable auto-scroll
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

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

    // Sanitize and validate input
    const sanitizedMessage = sanitizeHtml(messageToSend);
    
    // Check for profanity
    if (containsProfanity(sanitizedMessage)) {
      toast.error("Your message contains inappropriate language. Please revise your message.");
      return;
    }

    // Check question limit (skip if unlimited)
    if (maxQuestions !== Infinity && questionCount >= maxQuestions) {
      toast.error(`You've reached your limit of ${maxQuestions} questions. Upgrade to Pro for unlimited questions.`);
      return;
    }

    setInput("");
    setIsLoading(true);

    // Add user message immediately (use sanitized version)
    const userMessage: Message = { role: "user", content: sanitizedMessage };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/ai/chat/movie-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sanitizedMessage,
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

  // Convert URLs in text to clickable links
  const formatMessageWithLinks = (text: string) => {
    // URL regex pattern - matches full URLs (http:// or https://)
    // This pattern matches URLs and stops at whitespace or common punctuation (but includes trailing punctuation that's part of the URL)
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex
    urlRegex.lastIndex = 0;
    
    // Find all URLs and split the text
    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the URL
      parts.push(match[0]);
      lastIndex = urlRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no URLs found, return original text
    if (parts.length === 0) {
      return <span>{text}</span>;
    }
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      urlRegex.lastIndex = 0;
      if (urlRegex.test(part)) {
        // Extract domain for display text
        try {
          const url = new URL(part);
          const displayText = url.hostname.replace('www.', '');
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline break-words overflow-wrap-anywhere"
            >
              {displayText}
            </a>
          );
        } catch {
          // If URL parsing fails, show the URL as-is
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline break-words overflow-wrap-anywhere"
            >
              {part}
            </a>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      toast.success("Message copied to clipboard");
      setTimeout(() => {
        setCopiedMessageIndex(null);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
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

  const handleDeleteSession = async (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the session when clicking delete
    
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/chat/movie-details/sessions/${sessionIdToDelete}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Chat session deleted");
        
        // Check if we're deleting the current session
        const sessionToDelete = chatSessions.find(s => s.id === sessionIdToDelete);
        if (sessionToDelete && sessionToDelete.fullSessionId === `movie-details-${tmdbId}-${sessionId}`) {
          // If deleting current session, start a new chat
          handleNewChat();
        }
        
        // Reload sessions list
        loadChatSessions();
      } else {
        toast.error("Failed to delete chat session");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat session");
    }
  };

  const handleNewChat = () => {
    // Create a new session ID
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    setQuestionCount(0);
    setInput("");
    toast.success("New chat started");
  };

  const remainingQuestions = maxQuestions === Infinity ? Infinity : maxQuestions - questionCount;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[30rem] p-0 flex flex-col [&>button]:hidden">
        {/* Fixed Header */}
        <SheetHeader className="px-6 py-4 border-b space-y-0 flex-shrink-0">
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
                onClick={handleNewChat}
                disabled={messages.length === 0}
                title="Start new chat"
              >
                <SquarePen className="h-4 w-4" />
              </Button>
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

        {/* Scrollable Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 min-h-0"
        >
          <div className="px-3 py-4 space-y-4">
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
                      "max-w-[80%] rounded-lg px-4 py-2 relative group overflow-hidden",
                      message.role === "user"
                        ? "bg-[#edf3fe] text-black"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap pr-6 break-words overflow-wrap-anywhere">
                      {message.role === "assistant" ? formatMessageWithLinks(message.content) : message.content}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
                        message.role === "user"
                          ? "text-black hover:bg-black/10"
                          : "text-foreground hover:bg-foreground/10"
                      )}
                      onClick={() => handleCopyMessage(message.content, index)}
                      title="Copy message"
                    >
                      {copiedMessageIndex === index ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
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

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t bg-background">
          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="px-6 py-3 border-b">
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
          <div className="px-6 py-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => {
                  // Sanitize input on change to prevent malicious code
                  const sanitized = sanitizeHtml(e.target.value);
                  setInput(sanitized);
                }}
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
                  <div
                    key={session.id}
                    className="w-full p-4 rounded-lg border border-border hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => handleLoadSession(session.fullSessionId, session.sessionId)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
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
                      </button>
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.updatedAt), "MMM d, yyyy")}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete chat session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
