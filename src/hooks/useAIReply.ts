import { useState } from 'react';

export const useAIReply = () => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTone, setActiveTone] = useState<string | null>(null);

  const getSuggestions = async (messages: any[], tone: string, currentUserId: string) => {
    setIsLoading(true);
    setActiveTone(tone);
    try {
      const lastMessages = messages.slice(-6).map(m =>
        `${m.senderId === currentUserId ? 'Me' : 'Them'}: ${m.content || m.text}`
      ).join('\n');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `You are a chat assistant. Give exactly 3 short ${tone} reply suggestions based on the conversation. Reply in the same language as the conversation (Hindi/English/Hinglish). Return ONLY a raw JSON array with no markdown, no explanation: ["reply1", "reply2", "reply3"]`
            },
            {
              role: 'user',
              content: `Here are the last messages:\n${lastMessages}\n\nGive 3 ${tone} reply suggestions as a JSON array only.`
            }
          ]
        })
      });

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) throw new Error('No suggestions returned');
      
      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      setSuggestions(JSON.parse(clean));
    } catch (err) {
      console.error('Groq AI Reply Error:', err);
      setSuggestions(["Hey! 👋", "Sounds good!", "Tell me more"]);
    } finally {
      setIsLoading(false);
      setActiveTone(null);
    }
  };

  const clearSuggestions = () => setSuggestions([]);
  return { suggestions, isLoading, activeTone, getSuggestions, clearSuggestions };
};
