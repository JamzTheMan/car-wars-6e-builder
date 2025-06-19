/**
 * Parse a CSV file into an array of objects
 * @param csvContent The content of the CSV file as a string
 * @returns An array of objects, each representing a row in the CSV file
 */
export function parseCSV(csvContent: string): Record<string, string>[] {
  // Split the CSV content into lines
  const lines = csvContent.split(/\r\n|\n/);
  if (lines.length === 0) return [];
  
  // Extract the headers (first line)
  const headers = lines[0].split(',').map(header => header.trim());
  
  // Map each line to an object
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i]);
    
    // Create an object with the headers as keys
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = index < values.length ? values[index].trim() : '';
    });
    
    result.push(obj);
  }
  
  return result;
}

/**
 * Parse a single CSV line, respecting quoted values that may contain commas
 * @param line A single line from a CSV file
 * @returns An array of values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}
