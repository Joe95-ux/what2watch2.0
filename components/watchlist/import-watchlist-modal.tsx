"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWatchlist } from "@/hooks/use-watchlist";
import { parseAndAnalyzeCSV, validateCSV, type ParsedCSV } from "@/lib/csv-import";

interface ImportWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportWatchlistModal({
  isOpen,
  onClose,
}: ImportWatchlistModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCSV | null>(null);
  const [validation, setValidation] = useState<ReturnType<typeof validateCSV> | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    warnings: Array<{ row: number; warning: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refetch } = useWatchlist();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setImportResults(null);

    try {
      const content = await selectedFile.text();
      const parsed = parseAndAnalyzeCSV(content);
      const validationResult = validateCSV(parsed);

      setPreview(parsed);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        toast.error("CSV validation failed. Please check the errors.");
      } else if (validationResult.warnings.length > 0) {
        toast.warning("CSV has some warnings. Please review before importing.");
      } else {
        toast.success("CSV file is valid and ready to import!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to parse CSV file"
      );
      setFile(null);
      setPreview(null);
      setValidation(null);
    }
  };

  const handleImport = async () => {
    if (!file || !preview || !validation?.isValid) {
      toast.error("Please select a valid CSV file first");
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("duplicateAction", duplicateAction);

      const response = await fetch("/api/watchlist/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import watchlist");
      }

      setImportResults(data);
      
      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} item(s)`);
        refetch();
      }
      
      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} item(s) failed to import`);
      }

      if (data.skipped > 0) {
        toast.info(`${data.skipped} item(s) were skipped`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import watchlist"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setFile(null);
      setPreview(null);
      setValidation(null);
      setImportResults(null);
      setDuplicateAction("skip");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    }
  };

  const getSourceLabel = (source: ParsedCSV["detectedSource"]) => {
    switch (source) {
      case "what2watch":
        return "What2Watch";
      case "imdb":
        return "IMDb";
      case "tmdb":
        return "TMDB";
      default:
        return "Generic";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Watchlist from CSV</DialogTitle>
          <DialogDescription>
            Import movies and TV shows from a CSV file. Supports What2Watch exports
            and external formats (IMDb, TMDB, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {file ? file.name : "Select CSV File"}
                  </span>
                </Button>
              </label>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setValidation(null);
                    setImportResults(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="cursor-pointer"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Preview & Validation */}
          {preview && validation && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">File Analysis</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source:</span>{" "}
                    <span className="font-medium">
                      {getSourceLabel(preview.detectedSource)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rows:</span>{" "}
                    <span className="font-medium">{preview.rows.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Columns:</span>{" "}
                    <span className="font-medium">{preview.headers.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {validation.isValid ? (
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Valid
                      </span>
                    ) : (
                      <span className="font-medium text-red-600 dark:text-red-400">
                        Invalid
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detected Columns */}
              <div className="space-y-2">
                <div className="font-medium text-sm">Detected Columns:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.columnMapping).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <div
                        key={key}
                        className="px-2 py-1 bg-muted rounded text-xs"
                      >
                        <span className="text-muted-foreground">{key}:</span>{" "}
                        <span className="font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Errors */}
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Errors:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Warnings */}
              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Warnings:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sample Rows */}
              {validation.sampleRows.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Sample Rows (first 5):</div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            {preview.headers.slice(0, 6).map((header) => (
                              <th
                                key={header}
                                className="px-2 py-2 text-left font-medium"
                              >
                                {header}
                              </th>
                            ))}
                            {preview.headers.length > 6 && (
                              <th className="px-2 py-2 text-left font-medium">
                                ...
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {validation.sampleRows.map((row, index) => (
                            <tr key={index}>
                              {preview.headers.slice(0, 6).map((header) => (
                                <td key={header} className="px-2 py-2">
                                  {row[header]?.slice(0, 30) || ""}
                                  {row[header] && row[header].length > 30
                                    ? "..."
                                    : ""}
                                </td>
                              ))}
                              {preview.headers.length > 6 && <td>...</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Handling */}
              {validation.isValid && (
                <div className="space-y-2">
                  <Label>Duplicate Handling</Label>
                  <Select
                    value={duplicateAction}
                    onValueChange={(value) =>
                      setDuplicateAction(value as "skip" | "update")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">
                        Skip duplicates (keep existing)
                      </SelectItem>
                      <SelectItem value="update">
                        Update duplicates (overwrite existing)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="font-medium">Import Results:</div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResults.imported}
                  </div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importResults.skipped}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResults.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Import Errors:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {importResults.errors.map((error, index) => (
                        <div key={index}>
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResults.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Warnings:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {importResults.warnings.map((warning, index) => (
                        <div key={index}>
                          Row {warning.row}: {warning.warning}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
            className="cursor-pointer"
          >
            {importResults ? "Close" : "Cancel"}
          </Button>
          {preview && validation?.isValid && !importResults && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

