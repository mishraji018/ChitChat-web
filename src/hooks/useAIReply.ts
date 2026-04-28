import { useState } from 'react';

export const useAIReply = (currentUserId: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = async (messages: any[], tone: string) => {
    if (!messages || messages.length === 0) return;
    
    setIsLoading(true);
    try {
      const lastMessages = messages.slice(-6).map(m => ({
        role: m.senderId === currentUserId ? 'user' : 'assistant',
        content: m.content || m.text
      }));

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Gemini API key is missing');
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a chat assistant. Last 6 messages: 
                ${JSON.stringify(lastMessages)}
                
                Give exactly 3 short ${tone} reply suggestions.
                Reply in same language as conversation (Hindi/English/Hinglish).
                Return ONLY a JSON array of strings: ["reply1", "reply2", "reply3"]`
              }]
            }]
          })
        }
      );

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        setSuggestions(Array.isArray(parsed) ? parsed : []);
      } else {
        throw new Error('Invalid response from Gemini');
      }
    } catch (err) {
      console.error('AI error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, getSuggestions, clearSuggestions };
};
