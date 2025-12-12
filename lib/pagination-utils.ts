/**
 * Generate page numbers with ellipsis for pagination
 * Returns an array of page numbers and "ellipsis" strings
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | "ellipsis")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const half = Math.floor(maxVisible / 2);

  if (currentPage <= half + 1) {
    // Show first pages
    for (let i = 1; i <= maxVisible - 2; i++) {
      pages.push(i);
    }
    pages.push("ellipsis");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - half) {
    // Show last pages
    pages.push(1);
    pages.push("ellipsis");
    for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show middle pages
    pages.push(1);
    pages.push("ellipsis");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      pages.push(i);
    }
    pages.push("ellipsis");
    pages.push(totalPages);
  }

  return pages;
}

