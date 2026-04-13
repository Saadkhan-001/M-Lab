import { AI_CONFIG } from '../config/AIConfig';

export interface LabParameter {
  name: string;
  unit: string;
  range: string;
}

export class AIService {
  /**
   * Cleans AI response by stripping markdown code blocks if present
   */
  private static sanitizeJSON(content: string): string {
    return content.replace(/```json|```/g, '').trim();
  }

  static async fetchTestParameters(testName: string): Promise<LabParameter[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.OPENROUTER_API_KEY}`,
          'HTTP-Referer': AI_CONFIG.SITE_URL,
          'X-Title': AI_CONFIG.SITE_NAME,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional medical laboratory diagnostic configuration expert.
              Your task is to provide a COMPLETE and COMPREHENSIVE list of all standard parameters, sub-tests, and indicators for the requested laboratory diagnostic test.
              
              Rules:
              1. Return ONLY valid JSON.
              2. Provide at least 4-8 parameters for complex panels (e.g. Lipid Profile, Liver Function, CBC).
              3. Include standard SI or medical units.
              4. Include standard adult reference ranges.
              
              Format: 
              {
                "parameters": [
                  {"name": "Parameter Name", "unit": "unit", "range": "range"}
                ]
              }`
            },
            {
              role: 'user',
              content: `Provide a comprehensive list of all parameters for the diagnostic test: ${testName}`
            }
          ],
          temperature: 0.1, // Lower temperature for more consistent medical data
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0].message.content) {
        const rawContent = data.choices[0].message.content;
        const sanitized = this.sanitizeJSON(rawContent);
        const parsed = JSON.parse(sanitized);
        return parsed.parameters || [];
      }
      
      return [];
    } catch (error) {
      console.error('AIService Error:', error);
      return []; // Return empty instead of throwing to prevent UI crash
    }
  }
}
