/**
 * Extracts valid JSON from Perplexity API responses.
 * 
 * For reasoning models (sonar-reasoning-pro), the response includes
 * <think> tokens before the JSON. This function handles both cases:
 * - Regular models (sonar): response_format works, but we parse as fallback
 * - Reasoning models: extracts JSON after </think> marker
 * 
 * Based on: https://github.com/perplexityai/api-discussion/blob/main/utils/extract_json_reasoning_models.py
 */

export function extractValidJson(response: {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}): any {
  // Navigate to the 'content' field
  const content =
    response.choices?.[0]?.message?.content || "";

  if (!content) {
    throw new Error("No content found in response");
  }

  // Find the index of the closing </think> tag (for reasoning models)
  // Reasoning models output: <think>...reasoning...</think> {...json...}
  const marker = "</think>";
  const idx = content.lastIndexOf(marker);

  let jsonStr: string;

  if (idx === -1) {
    // No reasoning marker found - try parsing the entire content (regular models)
    jsonStr = content.trim();
  } else {
    // Extract the substring after the marker (reasoning models)
    jsonStr = content.substring(idx + marker.length).trim();
  }

  // Remove markdown code fence markers if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.substring(7).trim();
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.substring(3).trim();
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.substring(0, jsonStr.length - 3).trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse JSON from response:", jsonStr);
    throw new Error(
      `Failed to parse valid JSON from response content: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
