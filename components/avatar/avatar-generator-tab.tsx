"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarGeneratorTabProps {
  onSelect: (url: string) => void;
  selectedUrl: string | null;
}

// DiceBear avatar styles - free and no API key required
// Added more futuristic/tech styles
const AVATAR_STYLES = [
  { name: "Adventurer", value: "adventurer" },
  { name: "Avataaars", value: "avataaars" },
  { name: "Big Smile", value: "big-smile" },
  { name: "Bottts", value: "bottts", category: "futuristic" }, // Robot avatars
  { name: "Fun-emoji", value: "fun-emoji" },
  { name: "Icons", value: "icons" },
  { name: "Identicon", value: "identicon" },
  { name: "Lorelei", value: "lorelei" },
  { name: "Micah", value: "micah" },
  { name: "Miniavs", value: "miniavs" },
  { name: "Notionists", value: "notionists" },
  { name: "Open Peeps", value: "open-peeps" },
  { name: "Personas", value: "personas" },
  { name: "Pixel Art", value: "pixel-art" },
  { name: "Shapes", value: "shapes" },
  { name: "Thumbs", value: "thumbs" },
];

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52BE80",
  "#E74C3C", "#3498DB", "#9B59B6", "#1ABC9C", "#F39C12",
];

export function AvatarGeneratorTab({ onSelect, selectedUrl }: AvatarGeneratorTabProps) {
  const [selectedStyle, setSelectedStyle] = useState("adventurer");
  const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
  const [backgroundColor, setBackgroundColor] = useState(COLORS[0]);
  const [size, setSize] = useState([200]);
  
  // Avatar history for navigation
  const [avatarHistory, setAvatarHistory] = useState<Array<{ url: string; seed: string; style: string; bg: string }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const avatarUrl = useMemo(() => {
    const params = new URLSearchParams({
      seed: seed,
      backgroundColor: backgroundColor.replace("#", ""),
      size: size[0].toString(),
    });
    return `https://api.dicebear.com/7.x/${selectedStyle}/svg?${params.toString()}`;
  }, [selectedStyle, seed, backgroundColor, size]);

  const handleGenerate = () => {
    // Save current avatar to history before generating new one
    // Check if current avatar is already in history at current index
    const currentAvatar = { url: avatarUrl, seed, style: selectedStyle, bg: backgroundColor };
    const isCurrentInHistory = historyIndex >= 0 && 
      historyIndex < avatarHistory.length &&
      avatarHistory[historyIndex].url === avatarUrl;
    
    if (!isCurrentInHistory && avatarUrl) {
      // Current avatar is not in history, add it
      if (historyIndex === avatarHistory.length - 1) {
        // At the end, just append
        const newHistory = [...avatarHistory, currentAvatar];
        setAvatarHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      } else {
        // In the middle, truncate and add
        const truncatedHistory = avatarHistory.slice(0, historyIndex + 1);
        const newHistory = [...truncatedHistory, currentAvatar];
        setAvatarHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
    
    // Generate new avatar
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleSelect = () => {
    onSelect(avatarUrl);
  };

  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const prev = avatarHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSeed(prev.seed);
      setSelectedStyle(prev.style);
      setBackgroundColor(prev.bg);
    }
  };

  const handleHistoryForward = () => {
    if (historyIndex < avatarHistory.length - 1) {
      const next = avatarHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSeed(next.seed);
      setSelectedStyle(next.style);
      setBackgroundColor(next.bg);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < avatarHistory.length - 1;

  return (
    <div className="space-y-6">
      {/* Preview - Sticky on small screens */}
      <div className="sticky top-0 z-10 bg-background pb-4 -mx-6 px-6 border-b sm:border-b-0 sm:static sm:bg-transparent sm:pb-0 sm:-mx-0 sm:px-0">
        <div className="flex flex-col items-center space-y-4 pt-4 sm:pt-0">
          <div
            className="relative border-2 rounded-full overflow-hidden transition-all"
            style={{
              width: `${size[0]}px`,
              height: `${size[0]}px`,
              backgroundColor: backgroundColor,
              borderColor: selectedUrl === avatarUrl ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
          >
            <Image
              src={avatarUrl}
              alt="Generated avatar"
              width={size[0]}
              height={size[0]}
              className="object-cover"
              unoptimized
            />
          </div>

          <Button
            onClick={handleSelect}
            variant={selectedUrl === avatarUrl ? "default" : "outline"}
            className="cursor-pointer"
          >
            {selectedUrl === avatarUrl ? "Selected" : "Select This Avatar"}
          </Button>
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Avatar Style</label>
          <span className="text-xs text-muted-foreground">
            {AVATAR_STYLES.find(s => s.value === selectedStyle)?.category === "futuristic" && "🤖 Futuristic"}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {AVATAR_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value)}
              className={cn(
                "p-2 rounded-lg border text-xs transition-colors cursor-pointer relative",
                selectedStyle === style.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50",
                style.category === "futuristic" && "ring-1 ring-primary/30"
              )}
              title={style.category === "futuristic" ? "Futuristic style" : undefined}
            >
              {style.name}
              {style.category === "futuristic" && (
                <span className="absolute top-0 right-0 text-[8px]">🤖</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Generate New & History Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleGenerate}
            variant="outline"
            size="sm"
            className="cursor-pointer flex-1 sm:flex-initial"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate New
          </Button>
          
          {/* History Navigation */}
          {avatarHistory.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                onClick={handleHistoryBack}
                variant="outline"
                size="sm"
                disabled={!canGoBack}
                className="cursor-pointer"
                title="Previous avatar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleHistoryForward}
                variant="outline"
                size="sm"
                disabled={!canGoForward}
                className="cursor-pointer"
                title="Next avatar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* History Indicator */}
        {avatarHistory.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            {historyIndex + 1} of {avatarHistory.length} in history
          </div>
        )}

        {/* Background Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Background Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBackgroundColor(color)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all cursor-pointer",
                  backgroundColor === color
                    ? "border-primary scale-110"
                    : "border-border hover:scale-105"
                )}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label className="font-medium">Size</label>
            <span className="text-muted-foreground">{size[0]}px</span>
          </div>
          <Slider
            value={size}
            onValueChange={setSize}
            min={100}
            max={300}
            step={10}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

