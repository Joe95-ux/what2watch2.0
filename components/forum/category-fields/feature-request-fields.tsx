"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FeatureRequestFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function FeatureRequestFields({ metadata, onChange }: FeatureRequestFieldsProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="priority">
            Priority <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.priority || ""}
            onValueChange={(value) => updateField("priority", value)}
          >
            <SelectTrigger id="priority" className="cursor-pointer">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nice-to-have">Nice to Have</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="useCase">
            Use Case / Scenario <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="useCase"
            value={metadata.useCase || ""}
            onChange={(e) => updateField("useCase", e.target.value)}
            placeholder="Describe when and how you would use this feature..."
            rows={4}
            className="resize-none cursor-text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentWorkaround">Current Workaround</Label>
          <Textarea
            id="currentWorkaround"
            value={metadata.currentWorkaround || ""}
            onChange={(e) => updateField("currentWorkaround", e.target.value)}
            placeholder="How do you currently solve this problem?"
            rows={3}
            className="resize-none cursor-text"
          />
        </div>
    </div>
  );
}

