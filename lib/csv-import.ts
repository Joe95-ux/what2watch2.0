/**
 * CSV Import Utilities
 * Handles parsing and column mapping for CSV imports
 */

export interface CSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  title?: string;
  type?: string;
  tmdbId?: string;
  imdbId?: string;
  order?: string;
  position?: string; // For lists (uses position instead of order)
  note?: string;
  releaseDate?: string;
  year?: string;
  // External formats
  imdbConst?: string; // IMDb "Const" column
}

export interface ParsedCSV {
  headers: string[];
  rows: CSVRow[];
  detectedSource: 'what2watch' | 'imdb' | 'tmdb' | 'generic';
  columnMapping: ColumnMapping;
}

/**
 * Parse CSV string into rows and headers
 */
export function parseCSV(csvContent: string): { headers: string[]; rows: CSVRow[] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows
    
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields and commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return values;
}

/**
 * Normalize column name for matching (lowercase, remove spaces/special chars)
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[_\s-]/g, '');
}

/**
 * Detect CSV source and map columns
 */
export function detectSourceAndMapColumns(headers: string[]): {
  detectedSource: ParsedCSV['detectedSource'];
  columnMapping: ColumnMapping;
} {
  const normalizedHeaders = headers.map(normalizeColumnName);
  
  // Column name variations
  const titleVariants = ['title', 'name', 'movietitle', 'tvtitle'];
  const typeVariants = ['type', 'mediatype', 'media_type', 'kind'];
  const tmdbIdVariants = ['tmdbid', 'tmdb_id', 'tmdbid', 'themoviedbid'];
  const imdbIdVariants = ['imdbid', 'imdb_id', 'imdbid'];
  const orderVariants = ['order', 'rank', 'sortorder'];
  const positionVariants = ['position', 'rank', 'sortorder'];
  const noteVariants = ['note', 'notes', 'description', 'desc', 'comment'];
  const releaseDateVariants = ['releasedate', 'release_date', 'date', 'year'];
  const yearVariants = ['year', 'releaseyear', 'release_year'];
  const imdbConstVariants = ['const', 'imdbconst', 'imdb_const']; // IMDb export format

  const findColumn = (variants: string[]): string | undefined => {
    for (const variant of variants) {
      const index = normalizedHeaders.findIndex(h => h.includes(variant) || variant.includes(h));
      if (index !== -1) return headers[index];
    }
    return undefined;
  };

  const mapping: ColumnMapping = {
    title: findColumn(titleVariants),
    type: findColumn(typeVariants),
    tmdbId: findColumn(tmdbIdVariants),
    imdbId: findColumn(imdbIdVariants),
    order: findColumn(orderVariants),
    position: findColumn(positionVariants),
    note: findColumn(noteVariants),
    releaseDate: findColumn(releaseDateVariants),
    year: findColumn(yearVariants),
    imdbConst: findColumn(imdbConstVariants),
  };

  // Detect source
  let detectedSource: ParsedCSV['detectedSource'] = 'generic';
  
  // Check for What2Watch format (has specific columns)
  if (mapping.tmdbId && mapping.type && (mapping.order || normalizedHeaders.some(h => h.includes('datecreated')))) {
    detectedSource = 'what2watch';
  }
  // Check for IMDb format (has "Const" column)
  else if (mapping.imdbConst) {
    detectedSource = 'imdb';
  }
  // Check for TMDB format (has TMDB ID)
  else if (mapping.tmdbId && !mapping.imdbId) {
    detectedSource = 'tmdb';
  }

  return { detectedSource, columnMapping: mapping };
}

/**
 * Parse and analyze CSV file
 */
export function parseAndAnalyzeCSV(csvContent: string): ParsedCSV {
  const { headers, rows } = parseCSV(csvContent);
  const { detectedSource, columnMapping } = detectSourceAndMapColumns(headers);

  return {
    headers,
    rows,
    detectedSource,
    columnMapping,
  };
}

/**
 * Validate parsed CSV data
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sampleRows: CSVRow[];
}

export function validateCSV(parsed: ParsedCSV, maxSampleRows: number = 5): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sampleRows = parsed.rows.slice(0, maxSampleRows);

  // Check if we have any rows
  if (parsed.rows.length === 0) {
    errors.push('CSV file contains no data rows');
  }

  // Validate based on detected source
  if (parsed.detectedSource === 'what2watch') {
    // What2Watch format requires title, type, and tmdbId
    if (!parsed.columnMapping.title) {
      errors.push('Missing required column: Title');
    }
    if (!parsed.columnMapping.type) {
      errors.push('Missing required column: Type');
    }
    if (!parsed.columnMapping.tmdbId) {
      errors.push('Missing required column: TMDB ID');
    }
  } else if (parsed.detectedSource === 'imdb') {
    // IMDb format requires Const (IMDb ID) column
    if (!parsed.columnMapping.imdbConst) {
      errors.push('Missing required column: Const (IMDb ID)');
    }
  } else {
    // Generic format - need at least title or IMDb ID
    if (!parsed.columnMapping.title && !parsed.columnMapping.imdbId && !parsed.columnMapping.imdbConst) {
      errors.push('Missing required column: Title, IMDb ID, or Const');
    }
  }

  // Validate sample rows
  sampleRows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header
    
    if (parsed.detectedSource === 'what2watch') {
      if (!row[parsed.columnMapping.title!]?.trim()) {
        warnings.push(`Row ${rowNum}: Missing title`);
      }
      if (!row[parsed.columnMapping.type!]?.trim()) {
        warnings.push(`Row ${rowNum}: Missing type`);
      }
    } else if (parsed.detectedSource === 'imdb') {
      const constValue = row[parsed.columnMapping.imdbConst!];
      if (!constValue?.trim() || !constValue.startsWith('tt')) {
        warnings.push(`Row ${rowNum}: Invalid or missing IMDb ID in Const column`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sampleRows,
  };
}

