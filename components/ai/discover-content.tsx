"use client";

import { useState, useRef, useEffect } from "react";
import { useAiChat, type ChatMessage } from "@/hooks/use-ai-chat";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChatInput } from "@/components/ai/chat-input";

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
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [mode, setMode] = useState<"recommendation" | "information">("recommendation");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [currentResults, setCurrentResults] = useState<(TMDBMovie | TMDBSeries)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const infoScrollAreaRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAiChat(sessionId);

  // Reset when mode changes
  useEffect(() => {
    if (mode === "information") {
      setCurrentResults([]);
    } else {
      setMessages([]);
      setCurrentResults([]);
    }
  }, [mode]);

  // Auto-scroll to bottom when new messages arrive (information mode)
  useEffect(() => {
    if (mode === "information" && infoScrollAreaRef.current) {
      const scrollContainer = infoScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, mode]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    if (mode === "information") {
      setMessages((prev) => [...prev, userMessage]);
    }

    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content,
        conversationHistory: mode === "information" ? messages : [],
      });

      if (mode === "recommendation") {
        // Store results for pagination
        setCurrentResults(response.results);
        setCurrentPage(1);
      } else {
        // Information mode: show conversation (no movie cards)
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          intent: response.intent,
          metadata: response.metadata,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (mode === "information") {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
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

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "recommendation" | "information")} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <TabsContent value="recommendation" className="flex-1 flex flex-col w-full max-w-6xl min-h-0 mt-0">
            {/* Results Display */}
            {currentResults.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0 mb-4">
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-4 pr-4">
                    {paginatedResults.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedItem({
                          item,
                          type: "title" in item ? "movie" : "tv",
                        })}
                      >
                        <MovieCard
                          item={item}
                          type={"title" in item ? "movie" : "tv"}
                          variant="dashboard"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Tabs and Input Container - Centered */}
            <div className="w-full max-w-4xl mx-auto space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-muted/80">
                <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
                <TabsTrigger value="information">Information</TabsTrigger>
              </TabsList>

              {/* Input Area */}
              <div className="space-y-4">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSend}
                  isLoading={chatMutation.isPending}
                  placeholder="Ask for movie or TV show recommendations..."
                  disabled={chatMutation.isPending}
                />

                {/* Suggestions below input */}
                {currentResults.length === 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {RECOMMENDATION_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt)}
                        className="px-4 py-2 text-sm rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
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
              {/* Tabs */}
              <div className="w-full mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/80">
                  <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
                  <TabsTrigger value="information">Information</TabsTrigger>
                </TabsList>
              </div>

              {/* Chat Container - Grows with messages */}
              <div className={cn(
                "w-full flex flex-col border rounded-lg bg-card transition-all duration-300",
                infoChatHeight
              )}>
                {/* Messages Area */}
                <ScrollArea ref={infoScrollAreaRef} className="flex-1 p-4">
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
                            "rounded-lg px-4 py-2 max-w-[80%] sm:max-w-[70%]",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.role === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">U</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {chatMutation.isPending && (
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
                <div className="border-t p-4 space-y-4">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    isLoading={chatMutation.isPending}
                    placeholder="Ask about movies, TV shows, actors, or entertainment..."
                    disabled={chatMutation.isPending}
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
    </div>
  );
}
