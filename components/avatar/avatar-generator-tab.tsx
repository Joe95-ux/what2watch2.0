"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarGeneratorTabProps {
  onSelect: (url: string) => void;
  selectedUrl: string | null;
}

// DiceBear avatar styles - free and no API key required
const AVATAR_STYLES = [
  { name: "Adventurer", value: "adventurer" },
  { name: "Avataaars", value: "avataaars" },
  { name: "Big Smile", value: "big-smile" },
  { name: "Bottts", value: "bottts" },
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

  const avatarUrl = useMemo(() => {
    const params = new URLSearchParams({
      seed: seed,
      backgroundColor: backgroundColor.replace("#", ""),
      size: size[0].toString(),
    });
    return `https://api.dicebear.com/7.x/${selectedStyle}/svg?${params.toString()}`;
  }, [selectedStyle, seed, backgroundColor, size]);

  const handleGenerate = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleSelect = () => {
    onSelect(avatarUrl);
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex flex-col items-center space-y-4">
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

      {/* Style Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Avatar Style</label>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value)}
              className={cn(
                "p-2 rounded-lg border text-xs transition-colors cursor-pointer",
                selectedStyle === style.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Generate New */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            variant="outline"
            size="sm"
            className="cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate New
          </Button>
        </div>

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

