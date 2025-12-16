"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface BugReportFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function BugReportFields({ metadata, onChange }: BugReportFieldsProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Bug Report Details</Label>
        <p className="text-xs text-muted-foreground">
          Help us understand and fix the issue
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="severity">
            Severity <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.severity || ""}
            onValueChange={(value) => updateField("severity", value)}
          >
            <SelectTrigger id="severity" className="cursor-pointer">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stepsToReproduce">
            Steps to Reproduce <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="stepsToReproduce"
            value={metadata.stepsToReproduce || ""}
            onChange={(e) => updateField("stepsToReproduce", e.target.value)}
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
            rows={4}
            className="resize-none cursor-text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedBehavior">
            Expected Behavior <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="expectedBehavior"
            value={metadata.expectedBehavior || ""}
            onChange={(e) => updateField("expectedBehavior", e.target.value)}
            placeholder="What should happen?"
            rows={3}
            className="resize-none cursor-text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actualBehavior">
            Actual Behavior <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="actualBehavior"
            value={metadata.actualBehavior || ""}
            onChange={(e) => updateField("actualBehavior", e.target.value)}
            placeholder="What actually happens?"
            rows={3}
            className="resize-none cursor-text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="browserInfo">Browser/Device Info</Label>
          <Input
            id="browserInfo"
            value={metadata.browserInfo || ""}
            onChange={(e) => updateField("browserInfo", e.target.value)}
            placeholder="e.g., Chrome 120 on Windows 11"
            className="cursor-text"
          />
        </div>
      </div>
    </div>
  );
}

