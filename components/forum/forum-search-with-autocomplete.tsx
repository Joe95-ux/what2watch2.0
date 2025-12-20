"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Hash, Tag, FileText } from "lucide-react";
import { useSearchSuggestions } from "@/hooks/use-forum-search";
import { cn } from "@/lib/utils";

interface ForumSearchWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: { type: string; value: string }) => void;
  placeholder?: string;
  className?: string;
}

export function ForumSearchWithAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search posts, tags, categories...",
  className,
}: ForumSearchWithAutocompleteProps) {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSearchSuggestions(value, isFocused && value.length >= 2);

  const suggestions = data?.suggestions || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: { type: string; value: string; label: string }) => {
    if (suggestion.type === "tag") {
      router.push(`/forum?tag=${encodeURIComponent(suggestion.value)}`);
    } else if (suggestion.type === "category") {
      router.push(`/forum?category=${encodeURIComponent(suggestion.value)}`);
    } else if (suggestion.type === "post") {
      router.push(`/forum/posts/${suggestion.value}`);
    }
    
    if (onSelect) {
      onSelect(suggestion);
    }
    
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions.length > 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        // If no suggestion selected, just blur to close dropdown
        // The search will proceed with the current value
        setIsFocused(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "tag":
        return <Hash className="h-4 w-4" />;
      case "category":
        return <Tag className="h-4 w-4" />;
      case "post":
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative flex-1", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isFocused && value.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No suggestions found
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-accent transition-colors",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                  <span className="text-muted-foreground">
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <span className="text-sm flex-1">{suggestion.label}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {suggestion.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

