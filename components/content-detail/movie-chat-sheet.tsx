"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Loader2, History, HelpCircle, Clock, Copy, Check, SquarePen, Trash2, Mic, MicOff, CornerDownLeft } from "lucide-react";

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const isTranscribingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Check if MediaRecorder is supported (works in all modern browsers including Firefox)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSupported = 
        navigator.mediaDevices && 
        navigator.mediaDevices.getUserMedia && 
        typeof MediaRecorder !== "undefined";
      setIsSpeechSupported(isSupported);
    }
  }, []);

  // Cleanup: Stop recording when component unmounts or sheet closes
  useEffect(() => {
    return () => {
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Stop recording when sheet closes
  useEffect(() => {
    if (!isOpen && isListening) {
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsListening(false);
      isListeningRef.current = false;
      accumulatedTextRef.current = "";
    }
  }, [isOpen, isListening]);

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
    // Uses non-greedy matching and stops before whitespace, punctuation, or closing brackets
    const urlRegex = /(https?:\/\/[^\s<>"'\])]+)/g;
    const parts: Array<string | { url: string }> = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex
    urlRegex.lastIndex = 0;
    
    // Find all URLs and split the text
    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL (this preserves opening parentheses and brackets)
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the URL
      parts.push({ url: match[0] });
      lastIndex = urlRegex.lastIndex;
    }
    
    // Add remaining text (this preserves closing parentheses and brackets)
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no URLs found, return original text
    if (parts.length === 0 || parts.every(p => typeof p === 'string')) {
      return <span>{text}</span>;
    }
    
    return parts.map((part, index) => {
      if (typeof part === 'string') {
        return <span key={index}>{part}</span>;
      }
      
      // This is a URL
      try {
        const url = new URL(part.url);
        const displayText = url.hostname.replace('www.', '');
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-words overflow-wrap-anywhere"
          >
            {displayText}
          </a>
        );
      } catch {
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-words overflow-wrap-anywhere"
          >
            {part.url}
          </a>
        );
      }
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

  // Function to transcribe accumulated audio chunks
  const transcribeAccumulated = async (chunks: Blob[], mimeType: string, isFinal: boolean = false) => {
    if (isTranscribingRef.current && !isFinal) return; // Skip if already transcribing (unless it's the final chunk)
    if (chunks.length === 0) return;
    
    try {
      isTranscribingRef.current = true;
      
      // Combine all chunks into one blob
      const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
      
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.text && data.text.trim()) {
        const transcribedText = data.text.trim();
        
        // Update accumulated text and input field
        // We replace the accumulated text with the new full transcription
        setInput((prev) => {
          // Remove old accumulated text if it exists
          const baseText = prev.replace(accumulatedTextRef.current, "").trim();
          accumulatedTextRef.current = transcribedText;
          return baseText 
            ? `${baseText} ${transcribedText}`.trim()
            : transcribedText;
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      if (isFinal) {
        toast.error("Failed to transcribe audio. Please try again.");
      }
    } finally {
      isTranscribingRef.current = false;
    }
  };

  const handleVoiceInput = async () => {
    if (!isSpeechSupported) {
      toast.error("Voice input is not supported in your browser");
      return;
    }

    if (isListening) {
      // Stop recording and clear interval
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      
      // Stop the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      setIsListening(false);
      isListeningRef.current = false;
      accumulatedTextRef.current = "";
      return;
    }

    // Start recording
    try {
      // Reset accumulated text
      accumulatedTextRef.current = "";
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine the best audio format for the browser
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/ogg";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ""; // Use browser default
          }
        }
      }

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      const chunkDuration = 2000; // 2 seconds per chunk
      const transcriptionInterval = 3000; // Transcribe every 3 seconds

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up periodic transcription
      isListeningRef.current = true;
      transcriptionIntervalRef.current = setInterval(() => {
        if (isListeningRef.current && audioChunksRef.current.length > 0) {
          transcribeAccumulated([...audioChunksRef.current], mimeType || "audio/webm", false);
        }
      }, transcriptionInterval);

      mediaRecorder.onstop = async () => {
        // Clear interval
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
          transcriptionIntervalRef.current = null;
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Final transcription of any remaining audio
        if (audioChunksRef.current.length > 0) {
          await transcribeAccumulated([...audioChunksRef.current], mimeType || "audio/webm", true);
          audioChunksRef.current = [];
        }

        setIsListening(false);
        isListeningRef.current = false;
        accumulatedTextRef.current = "";
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        toast.error("Recording error. Please try again.");
        setIsListening(false);
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
          transcriptionIntervalRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        accumulatedTextRef.current = "";
      };

      // Start recording with timeslice to get chunks every 2 seconds
      mediaRecorder.start(chunkDuration);
      setIsListening(true);
      isListeningRef.current = true;
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      setIsListening(false);
      accumulatedTextRef.current = "";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please enable microphone access in your browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else {
        toast.error("Failed to access microphone. Please try again.");
      }
    }
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
                        "absolute bottom-1 right-1 h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer",
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
            <div className="relative rounded-lg border border-border bg-background">
              <div className="flex items-end gap-2 p-2">
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
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none min-h-[44px] max-h-[200px] placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1 pb-1">
                  <Button
                    onClick={handleVoiceInput}
                    disabled={isLoading || questionCount >= maxQuestions || !isSpeechSupported}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 cursor-pointer shrink-0",
                      isListening && "text-destructive animate-pulse"
                    )}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading || questionCount >= maxQuestions}
                    size="icon"
                    className="h-8 w-8 cursor-pointer shrink-0"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CornerDownLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
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
                    className="w-full p-4 rounded-lg border border-border hover:bg-muted transition-colors group relative"
                  >
                    <button
                      onClick={() => handleLoadSession(session.fullSessionId, session.sessionId)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {session.title}
                        </span>
                      </div>
                      {session.firstMessage && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2 pr-10">
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
                        <span className="text-muted-foreground">
                          {format(new Date(session.updatedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete chat session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
