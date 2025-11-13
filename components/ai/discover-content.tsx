"use client";

import { useState, useRef, useEffect } from "react";
import { useAiChat, type ChatMessage } from "@/hooks/use-ai-chat";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Info } from "lucide-react";
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAiChat(sessionId);

  // Reset when mode changes
  useEffect(() => {
    if (mode === "information") {
      setMessages([]);
      setCurrentResults([]);
    } else {
      setMessages([]);
      setCurrentResults([]);
    }
  }, [mode]);

  // Auto-scroll to bottom when new messages arrive (information mode)
  useEffect(() => {
    if (mode === "information" && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
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
        // Information mode: show conversation
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          results: response.results,
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

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-semibold">Discover</h1>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "recommendation" | "information")} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
          <TabsTrigger value="information">Information</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendation" className="flex-1 flex flex-col min-h-0 mt-0">
          {/* Results Display */}
          {currentResults.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0 mb-4">
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-4">
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
              </div>

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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground max-w-md">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Find your next watch</p>
                <p className="text-sm mb-6">
                  Ask for movie or TV show recommendations based on your preferences.
                </p>
              </div>
            </div>
          )}

          {/* Input Area with Suggestions */}
          <div className="border-t pt-4">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={chatMutation.isPending}
              placeholder="Ask for movie or TV show recommendations..."
              disabled={chatMutation.isPending}
              suggestions={currentResults.length === 0 ? RECOMMENDATION_PROMPTS : []}
              onSuggestionClick={handlePromptClick}
              showSuggestions={currentResults.length === 0}
            />
          </div>
        </TabsContent>

        <TabsContent value="information" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-card">
            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Get information about movies and TV shows</p>
                    <p className="text-sm">
                      Ask me about specific titles, plots, cast, or any details you want to know.
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
                      
                      {/* Results Display */}
                      {message.results && message.results.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-3">
                            Found {message.results.length} {message.results.length === 1 ? "result" : "results"}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {message.results.map((item) => (
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
                        </div>
                      )}
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
            <div className="border-t p-4">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSend}
                isLoading={chatMutation.isPending}
                placeholder="Ask about a specific movie or TV show..."
                disabled={chatMutation.isPending}
              />
            </div>
          </div>
        </TabsContent>
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
