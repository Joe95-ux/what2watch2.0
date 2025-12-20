import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchSuggestion {
  type: "tag" | "category" | "post";
  value: string;
  label: string;
  count?: number;
}

interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}

/**
 * Hook for search suggestions with debouncing
 */
export function useSearchSuggestions(query: string, enabled: boolean = true) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<SearchSuggestionsResponse>({
    queryKey: ["forum-search-suggestions", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { suggestions: [] };
      }
      const response = await fetch(
        `/api/forum/search/suggestions?query=${encodeURIComponent(debouncedQuery)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      return response.json();
    },
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for tag autocomplete
 */
export function useTagAutocomplete(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<string[]>({
    queryKey: ["forum-tag-autocomplete", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }
      const response = await fetch(
        `/api/forum/search/suggestions?query=${encodeURIComponent(debouncedQuery)}&type=tags`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch tag suggestions");
      }
      const data = await response.json();
      return data.suggestions.map((s: SearchSuggestion) => s.value);
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

