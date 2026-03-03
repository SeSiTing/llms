/**
 * Function name utilities for LLM providers
 * 
 * This module provides utilities for sanitizing function names to comply with
 * different LLM providers' requirements, particularly Google Gemini.
 */

/**
 * Sanitize function name to comply with Google Gemini requirements:
 * - Must start with a letter or underscore
 * - Must be alphanumeric (a-z, A-Z, 0-9), underscores (_), dots (.), colons (:), or dashes (-)
 * - Maximum length of 64 characters
 * 
 * @param name - The original function name
 * @returns The sanitized function name
 */
export function sanitizeFunctionName(name: string): string {
  const validStart = /^[a-zA-Z_]/;
  const validChars = /^[a-zA-Z0-9_.\-:]*$/;

  if (!validStart.test(name) || !validChars.test(name) || name.length > 64) {
    // Fix invalid start character
    let fixed = name.replace(/^[^a-zA-Z_]/, "func_");
    // Replace invalid characters with underscore
    fixed = fixed.replace(/[^a-zA-Z0-9_.\-:]/g, "_");
    // Truncate to max length
    if (fixed.length > 64) {
      fixed = fixed.substring(0, 64);
    }
    return fixed;
  }
  return name;
}
