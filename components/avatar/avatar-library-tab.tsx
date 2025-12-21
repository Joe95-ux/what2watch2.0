"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarLibraryTabProps {
  onSelect: (url: string) => void;
  selectedUrl: string | null;
}

// Pre-made avatar library using different DiceBear styles with various seeds
const AVATAR_LIBRARY = [
  // Adventurer style
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=alice&backgroundColor=b6e3f4", name: "Adventurer 1" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=bob&backgroundColor=ffd5dc", name: "Adventurer 2" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=charlie&backgroundColor=ffdfbf", name: "Adventurer 3" },
  
  // Avataaars style
  { url: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana&backgroundColor=b6e3f4", name: "Avataaars 1" },
  { url: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffd5dc", name: "Avataaars 2" },
  { url: "https://api.dicebear.com/7.x/avataaars/svg?seed=frank&backgroundColor=ffdfbf", name: "Avataaars 3" },
  
  // Big Smile style
  { url: "https://api.dicebear.com/7.x/big-smile/svg?seed=grace&backgroundColor=b6e3f4", name: "Big Smile 1" },
  { url: "https://api.dicebear.com/7.x/big-smile/svg?seed=henry&backgroundColor=ffd5dc", name: "Big Smile 2" },
  { url: "https://api.dicebear.com/7.x/big-smile/svg?seed=ivy&backgroundColor=ffdfbf", name: "Big Smile 3" },
  
  // Bottts style
  { url: "https://api.dicebear.com/7.x/bottts/svg?seed=jack&backgroundColor=b6e3f4", name: "Bottts 1" },
  { url: "https://api.dicebear.com/7.x/bottts/svg?seed=kate&backgroundColor=ffd5dc", name: "Bottts 2" },
  { url: "https://api.dicebear.com/7.x/bottts/svg?seed=liam&backgroundColor=ffdfbf", name: "Bottts 3" },
  
  // Fun-emoji style
  { url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=maya&backgroundColor=b6e3f4", name: "Fun Emoji 1" },
  { url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=nina&backgroundColor=ffd5dc", name: "Fun Emoji 2" },
  { url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=oscar&backgroundColor=ffdfbf", name: "Fun Emoji 3" },
  
  // Lorelei style
  { url: "https://api.dicebear.com/7.x/lorelei/svg?seed=penny&backgroundColor=b6e3f4", name: "Lorelei 1" },
  { url: "https://api.dicebear.com/7.x/lorelei/svg?seed=quinn&backgroundColor=ffd5dc", name: "Lorelei 2" },
  { url: "https://api.dicebear.com/7.x/lorelei/svg?seed=ryan&backgroundColor=ffdfbf", name: "Lorelei 3" },
  
  // Micah style
  { url: "https://api.dicebear.com/7.x/micah/svg?seed=sarah&backgroundColor=b6e3f4", name: "Micah 1" },
  { url: "https://api.dicebear.com/7.x/micah/svg?seed=tom&backgroundColor=ffd5dc", name: "Micah 2" },
  { url: "https://api.dicebear.com/7.x/micah/svg?seed=una&backgroundColor=ffdfbf", name: "Micah 3" },
  
  // Notionists style
  { url: "https://api.dicebear.com/7.x/notionists/svg?seed=victor&backgroundColor=b6e3f4", name: "Notionists 1" },
  { url: "https://api.dicebear.com/7.x/notionists/svg?seed=willa&backgroundColor=ffd5dc", name: "Notionists 2" },
  { url: "https://api.dicebear.com/7.x/notionists/svg?seed=xander&backgroundColor=ffdfbf", name: "Notionists 3" },
  
  // Open Peeps style
  { url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=yara&backgroundColor=b6e3f4", name: "Open Peeps 1" },
  { url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=zoe&backgroundColor=ffd5dc", name: "Open Peeps 2" },
  { url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=adam&backgroundColor=ffdfbf", name: "Open Peeps 3" },
  
  // Personas style
  { url: "https://api.dicebear.com/7.x/personas/svg?seed=bella&backgroundColor=b6e3f4", name: "Personas 1" },
  { url: "https://api.dicebear.com/7.x/personas/svg?seed=carlos&backgroundColor=ffd5dc", name: "Personas 2" },
  { url: "https://api.dicebear.com/7.x/personas/svg?seed=daisy&backgroundColor=ffdfbf", name: "Personas 3" },
  
  // Pixel Art style
  { url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ethan&backgroundColor=b6e3f4", name: "Pixel Art 1" },
  { url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=fiona&backgroundColor=ffd5dc", name: "Pixel Art 2" },
  { url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=george&backgroundColor=ffdfbf", name: "Pixel Art 3" },
];

export function AvatarLibraryTab({ onSelect, selectedUrl }: AvatarLibraryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAvatars = useMemo(() => {
    if (!searchQuery) return AVATAR_LIBRARY;
    return AVATAR_LIBRARY.filter((avatar) =>
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search avatars..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Avatar Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {filteredAvatars.map((avatar, index) => (
          <button
            key={`${avatar.url}-${index}`}
            onClick={() => onSelect(avatar.url)}
            className={cn(
              "relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105",
              selectedUrl === avatar.url
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : "border-border hover:border-primary/50"
            )}
            aria-label={avatar.name}
          >
            <Image
              src={avatar.url}
              alt={avatar.name}
              fill
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>

      {filteredAvatars.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No avatars found matching your search.</p>
        </div>
      )}
    </div>
  );
}

