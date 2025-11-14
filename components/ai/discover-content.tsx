"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { type ChatMessage } from "@/hooks/use-ai-chat";
import { useChatSessions, useSaveChatSession, useDeleteChatSession } from "@/hooks/use-ai-chat-sessions";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Info, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChatInput } from "@/components/ai/chat-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

const RECOMMENDATION_PROMPTS = [
  "I want something scary but not too gory",
  "Show me action movies from the 90s",
  "Comedy TV shows from the last 5 years",
  "Sci-fi movies with great visuals",
  "Drama series with strong female leads",
  "Horror movies that are actually scary",
  "Romantic comedies from the 2000s",
  "Thriller movies with plot twists",
];

export default function DiscoverContent() {
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [mode, setMode] = useState<"recommendation" | "information">("recommendation");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [currentResults, setCurrentResults] = useState<(TMDBMovie | TMDBSeries)[]>([]);
  const [currentResultsSessionId, setCurrentResultsSessionId] = useState<string>(""); // Store sessionId for current results
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>(""); // Store last user prompt for recommendation mode
  const [streamingMessage, setStreamingMessage] = useState<string>(""); // For typing animation
  const [isStreaming, setIsStreaming] = useState(false); // Track if currently streaming
  const itemsPerPage = 12;
  const infoScrollAreaRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  const hasAutoLoadedRef = useRef(false);
  const lastSavedDataRef = useRef<string>(""); // Track last saved data to prevent duplicate saves
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Track typing interval for cleanup
  
  // Keep ref in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  const { user } = useUser();
  const queryClient = useQueryClient();
  const saveSessionMutation = useSaveChatSession();
  const deleteSessionMutation = useDeleteChatSession();
  const { data: sessionsData } = useChatSessions();

  // Load session when selected
  const loadSession = useCallback(async (targetSessionId: string) => {
    try {
      const response = await fetch(`/api/ai/chat/sessions/${targetSessionId}`);
      if (!response.ok) return;
      const data = await response.json();
      const session = data.session;

      setSessionId(session.sessionId);
      setMode(session.mode as "recommendation" | "information");
      
      // Parse messages
      if (Array.isArray(session.messages)) {
        const parsedMessages: ChatMessage[] = session.messages.map((msg: {
          role: "user" | "assistant";
          content: string;
          results?: (TMDBMovie | TMDBSeries)[];
          intent?: "RECOMMENDATION" | "INFORMATION";
          metadata?: unknown;
          timestamp?: string;
        }) => ({
          role: msg.role,
          content: msg.content,
          results: msg.results,
          intent: msg.intent,
          metadata: msg.metadata,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        setMessages(parsedMessages);
      }

      // Load results for recommendation mode
      if (session.mode === "recommendation" && session.metadata && typeof session.metadata === "object" && "results" in session.metadata) {
        const metadata = session.metadata as { results?: (TMDBMovie | TMDBSeries)[] };
        const results = metadata.results;
        if (Array.isArray(results)) {
          setCurrentResults(results);
          setCurrentResultsSessionId(session.sessionId); // Store sessionId for loaded results
        }
      }

      // Load last user prompt for recommendation mode
      if (session.mode === "recommendation" && Array.isArray(session.messages) && session.messages.length > 0) {
        const firstMessage = session.messages[0] as { role?: string; content?: string };
        if (firstMessage && firstMessage.role === "user" && firstMessage.content) {
          setLastUserPrompt(firstMessage.content);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  }, []);

  // Load most recent session on mount (only once)
  useEffect(() => {
    if (sessionsData?.sessions && sessionsData.sessions.length > 0 && !hasAutoLoadedRef.current) {
      // Find the most recent session for the current mode
      const recentSession = sessionsData.sessions
        .filter((s) => s.mode === mode)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      
      if (recentSession) {
        hasAutoLoadedRef.current = true;
        loadSession(recentSession.sessionId);
      }
    }
  }, [sessionsData, mode, loadSession]); // Only run when sessions data or mode changes

  // Save session after messages change (debounced and only when data actually changes)
  useEffect(() => {
    let saveData: {
      sessionId: string;
      mode: "recommendation" | "information";
      messages: unknown[];
      metadata?: unknown;
      title?: string;
    } | null = null;

    if (mode === "information" && messages.length > 0) {
      saveData = {
        sessionId,
        mode,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          results: msg.results,
          intent: msg.intent,
          metadata: msg.metadata,
          timestamp: msg.timestamp.toISOString(),
        })),
        metadata: {},
      };
    } else if (mode === "recommendation" && currentResults.length > 0 && lastUserPrompt) {
      saveData = {
        sessionId,
        mode,
        messages: [{
          role: "user" as const,
          content: lastUserPrompt,
          timestamp: new Date().toISOString(),
        }],
        metadata: {
          results: currentResults,
        },
        title: lastUserPrompt.length > 50 ? lastUserPrompt.substring(0, 50) + "..." : lastUserPrompt,
      };
    }

    // Only save if we have data and it's different from the last saved data
    if (saveData) {
      const dataString = JSON.stringify(saveData);
      if (dataString === lastSavedDataRef.current) {
        // Data hasn't changed, skip save
        return;
      }

      // Debounce saves
      const timeoutId = setTimeout(() => {
        lastSavedDataRef.current = dataString;
        saveSessionMutation.mutate(saveData!);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentResults, mode, sessionId, lastUserPrompt]); // saveSessionMutation is stable from React Query

  // Save session before mode changes (cleanup runs with old values when mode changes)
  const prevModeRef = useRef(mode);
  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    
    // If mode changed, save the previous mode's data
    if (prevMode !== mode && prevMode) {
      if (prevMode === "information" && messages.length > 0) {
        const saveData = {
          sessionId,
          mode: prevMode,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            results: msg.results,
            intent: msg.intent,
            metadata: msg.metadata,
            timestamp: msg.timestamp.toISOString(),
          })),
          metadata: {},
        };
        const dataString = JSON.stringify(saveData);
        if (dataString !== lastSavedDataRef.current) {
          lastSavedDataRef.current = dataString;
          saveSessionMutation.mutate(saveData);
        }
      } else if (prevMode === "recommendation" && currentResults.length > 0 && lastUserPrompt) {
        const saveData = {
          sessionId,
          mode: prevMode,
          messages: [{
            role: "user" as const,
            content: lastUserPrompt,
            timestamp: new Date().toISOString(),
          }],
          metadata: {
            results: currentResults,
          },
          title: lastUserPrompt.length > 50 ? lastUserPrompt.substring(0, 50) + "..." : lastUserPrompt,
        };
        const dataString = JSON.stringify(saveData);
        if (dataString !== lastSavedDataRef.current) {
          lastSavedDataRef.current = dataString;
          saveSessionMutation.mutate(saveData);
        }
      }
    }
  }, [mode, sessionId, messages, currentResults, lastUserPrompt, saveSessionMutation]);

  // Reset when mode changes (but keep sessionId)
  useEffect(() => {
    if (mode === "information") {
      setCurrentResults([]);
    } else {
      setMessages([]);
      setCurrentResults([]);
    }
    // Cleanup typing interval on mode change
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage("");
  }, [mode]);
  
  // Cleanup typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive or when streaming (information mode)
  useEffect(() => {
    if (mode === "information" && infoScrollAreaRef.current) {
      const scrollContainer = infoScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, mode, streamingMessage]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    if (mode === "information") {
      setMessages((prev) => [...prev, userMessage]);
    }

    setInput("");

    // For recommendation mode, create a new session for each query
    let currentSessionId = sessionId;
    if (mode === "recommendation") {
      currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(currentSessionId);
      sessionIdRef.current = currentSessionId;
    }

    try {
      // Use current sessionId for the API call
      const requestBody = {
        message: userMessage.content,
        sessionId: currentSessionId,
        conversationHistory: mode === "information" ? messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) : [],
        mode,
      };

      console.log("Sending request:", { mode, message: userMessage.content.substring(0, 50) });

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to process chat message" }));
        console.error("API error:", error);
        throw new Error(error.error || "Failed to process chat message");
      }

      const responseData = await response.json();
      console.log("Response received:", { mode, resultsCount: responseData.results?.length || 0 });

      if (mode === "recommendation") {
        // Store results for pagination
        if (responseData.results && Array.isArray(responseData.results)) {
          setCurrentResults(responseData.results);
          setCurrentResultsSessionId(currentSessionId); // Store sessionId for these results
          setCurrentPage(1);
          // Store user prompt for session title
          setLastUserPrompt(userMessage.content);
          console.log("Results set:", responseData.results.length);
          console.log("[Track Interaction] Set currentResultsSessionId to:", currentSessionId, "for tracking clicks");
        } else {
          console.warn("No results in response:", responseData);
          throw new Error("No results returned from the API");
        }
      } else {
        // Information mode: show conversation with typing animation
        const fullMessage = responseData.message;
        setIsStreaming(true);
        setStreamingMessage("");
        
        // Clear any existing interval
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        
        // Simulate typing animation
        let currentIndex = 0;
        typingIntervalRef.current = setInterval(() => {
          if (currentIndex < fullMessage.length) {
            setStreamingMessage(fullMessage.substring(0, currentIndex + 1));
            currentIndex++;
          } else {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
            setIsStreaming(false);
            // Add complete message to messages array
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: fullMessage,
              intent: responseData.intent,
              metadata: responseData.metadata,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingMessage("");
          }
        }, 5); // Adjust speed: lower = faster typing (5ms = very fast)
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Clear typing interval on error
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setIsStreaming(false);
      setStreamingMessage("");
      
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error processing your request. Please try again.";
      
      if (mode === "information") {
        const errorChatMessage: ChatMessage = {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorChatMessage]);
      } else {
        // For recommendation mode, show error in console and reset
        console.error("Recommendation error:", errorMessage);
        // Could show a toast notification here if needed
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleNewChat = () => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([]);
    setCurrentResults([]);
    setCurrentResultsSessionId("");
    setInput("");
    setLastUserPrompt("");
  };

  const handleDeleteSession = async (targetSessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      try {
        await deleteSessionMutation.mutateAsync(targetSessionId);
        if (targetSessionId === sessionId) {
          handleNewChat();
        }
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    }
  };

  // Track AI chat interactions
  const trackInteraction = async (interactionType: "click" | "add_to_playlist") => {
    if (mode !== "recommendation") {
      console.warn("[Track Interaction] Not in recommendation mode, skipping tracking");
      return;
    }
    
    // Use the sessionId associated with the current results
    const trackingSessionId = currentResultsSessionId || sessionId;
    if (!trackingSessionId) {
      console.warn("[Track Interaction] No sessionId available for tracking. currentResultsSessionId:", currentResultsSessionId, "sessionId:", sessionId);
      return;
    }
    
    console.log(`[Track Interaction] Tracking ${interactionType} for sessionId: ${trackingSessionId}`);
    console.log(`[Track Interaction] Current state - mode: ${mode}, currentResultsSessionId: ${currentResultsSessionId}, sessionId: ${sessionId}, currentResults.length: ${currentResults.length}`);
    
    try {
      const response = await fetch("/api/ai/chat/track-interaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: trackingSessionId,
          interactionType,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error(`[Track Interaction] Failed to track ${interactionType}:`, error);
        console.error(`[Track Interaction] Response status: ${response.status}, statusText: ${response.statusText}`);
      } else {
        const result = await response.json();
        console.log(`[Track Interaction] Successfully tracked ${interactionType} for session ${trackingSessionId}`, result);
        // Invalidate analytics query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["ai-analytics"] });
      }
    } catch (error) {
      console.error("[Track Interaction] Error tracking interaction:", error);
      // Don't show error to user, just log it
    }
  };

  // Pagination for recommendation results
  const totalPages = Math.ceil(currentResults.length / itemsPerPage);
  const paginatedResults = currentResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate information chat height (starts small, grows with messages)
  const infoChatHeight = messages.length === 0 
    ? "min-h-[200px]" 
    : messages.length <= 3 
    ? "min-h-[300px]" 
    : "min-h-[500px] max-h-[calc(100vh-300px)]";

  const sessions = sessionsData?.sessions || [];
  const filteredSessions = sessions.filter((s) => s.mode === mode);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <Tabs value={mode} onValueChange={(v) => {
        // Save current state before switching tabs
        const newMode = v as "recommendation" | "information";
        if (mode === "information" && messages.length > 0) {
          const saveData = {
            sessionId,
            mode: "information" as "recommendation" | "information",
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              results: msg.results,
              intent: msg.intent,
              metadata: msg.metadata,
              timestamp: msg.timestamp.toISOString(),
            })),
            metadata: {},
          };
          const dataString = JSON.stringify(saveData);
          if (dataString !== lastSavedDataRef.current) {
            lastSavedDataRef.current = dataString;
            saveSessionMutation.mutate(saveData);
          }
        } else if (mode === "recommendation" && currentResults.length > 0 && lastUserPrompt) {
          const saveData = {
            sessionId,
            mode: "recommendation" as "recommendation" | "information",
            messages: [{
              role: "user" as const,
              content: lastUserPrompt,
              timestamp: new Date().toISOString(),
            }],
            metadata: {
              results: currentResults,
            },
            title: lastUserPrompt.length > 50 ? lastUserPrompt.substring(0, 50) + "..." : lastUserPrompt,
          };
          const dataString = JSON.stringify(saveData);
          if (dataString !== lastSavedDataRef.current) {
            lastSavedDataRef.current = dataString;
            saveSessionMutation.mutate(saveData);
          }
        }
        setMode(newMode);
      }} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {/* Header with History */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 px-2">
            {/* Tabs - Centered */}
            <TabsList className="grid w-full sm:w-fit grid-cols-2">
              <TabsTrigger value="recommendation" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Recommendation</span>
                <span className="sm:hidden">Recommend</span>
              </TabsTrigger>
              <TabsTrigger value="information" className="text-xs sm:text-sm">
                Information
              </TabsTrigger>
            </TabsList>

            {/* Chat History Dropdown */}
            {filteredSessions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                    <span className="sm:hidden">Chats</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground sticky top-0 z-10 border-b">
                    Chat History
                  </div>
                  <ScrollArea className="h-[400px] w-64">
                    <div className="p-1 max-w-64">
                      {filteredSessions.map((session) => (
                        <DropdownMenuItem
                          key={session.id}
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => loadSession(session.sessionId)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {session.title || "Untitled Chat"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => handleDeleteSession(session.sessionId, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* New Chat Button */}
            {(messages.length > 0 || currentResults.length > 0) && (
              <Button variant="outline" size="sm" onClick={handleNewChat} className="w-full sm:w-auto">
                New Chat
              </Button>
            )}
          </div>

          <TabsContent value="recommendation" className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl min-h-0 mt-0">
            {/* Results Display - Centered */}
            {currentResults.length > 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 mb-4 w-full">
                <ScrollArea className="flex-1 w-full max-h-[calc(100vh-400px)]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 pb-4 pr-4">
                    {paginatedResults.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer"
                      >
                        <MovieCard
                          item={item}
                          type={"title" in item ? "movie" : "tv"}
                          variant="dashboard"
                          onCardClick={() => {
                            setSelectedItem({
                              item,
                              type: "title" in item ? "movie" : "tv",
                            });
                            trackInteraction("click");
                          }}
                          onAddToPlaylist={() => trackInteraction("add_to_playlist")}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t w-full gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-initial"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex-1 sm:flex-initial"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Input Container - Centered */}
            <div className="w-full max-w-4xl mx-auto space-y-4">
              {/* Input Area */}
              <div className="space-y-4">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSend}
                  isLoading={isLoading}
                  placeholder="Ask for movie or TV show recommendations..."
                  disabled={isLoading}
                />

                {/* Suggestions below input */}
                {currentResults.length === 0 && (
                  <div className="flex flex-wrap gap-2 justify-center px-2">
                    {RECOMMENDATION_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="information" className="flex-1 flex flex-col w-full max-w-4xl min-h-0 mt-0">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              {/* Chat Container - Grows with messages */}
              <div className={cn(
                "w-full flex flex-col border rounded-lg bg-card transition-all duration-300",
                infoChatHeight
              )}>
                {/* Messages Area */}
                <ScrollArea ref={infoScrollAreaRef} className="flex-1 p-3 sm:p-4 max-h-[calc(100vh-400px)]">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          Ask me about movies, TV shows, actors, directors, or any entertainment-related questions.
                        </p>
                      </div>
                    )}

                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Info className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-3 sm:px-4 py-2 max-w-[85%] sm:max-w-[70%]",
                            message.role === "user"
                              ? "bg-muted/80 dark:bg-muted/60 text-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        {message.role === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-border">
                            {user?.imageUrl ? (
                              <Image
                                src={user.imageUrl}
                                alt={user.firstName || "User"}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Streaming message display */}
                    {isStreaming && streamingMessage && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-lg px-3 sm:px-4 py-2 max-w-[85%] sm:max-w-[70%] bg-muted">
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                            {streamingMessage}
                            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse">|</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {isLoading && !isStreaming && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-lg px-4 py-2 bg-muted">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-3 sm:p-4 space-y-4">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    isLoading={isLoading}
                    placeholder="Ask about movies, TV shows, actors, or entertainment..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* AI Disclaimer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          ⚠️ Results are AI-generated and may contain inaccuracies. Please verify information independently.
        </p>
      </div>
    </div>
  );
}
