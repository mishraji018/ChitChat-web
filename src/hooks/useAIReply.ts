import { useState } from 'react';

export const useAIReply = () => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = async (messages: any[], currentUserId: string) => {
    setIsLoading(true);
    try {
      const validMessages = messages
        .filter(m => (m.content || m.text) && typeof (m.content || m.text) === 'string')
        .slice(-5)
        .map(m => `${m.senderId === currentUserId ? 'Me' : 'Them'}: ${m.content || m.text}`)
        .join('\n');

      if (!validMessages) {
        setSuggestions(["Hey! 👋", "How are you?", "What's up?"]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          max_tokens: 150,
          messages: [
            {
              role: 'system',
              content: `You are a chat assistant. Based on the conversation, suggest 3 short natural reply options the user might want to send next. Same language as conversation (Hindi/English/Hinglish). Return ONLY raw JSON array: ["reply1","reply2","reply3"]`
            },
            {
              role: 'user',
              content: `Last messages:\n${validMessages}\n\nSuggest 3 replies in JSON.`
            }
          ]
        })
      });

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        setSuggestions(["Hey! 👋", "Sounds good!", "Tell me more"]);
        return;
      }

      const text = data.choices[0].message.content;
      setSuggestions(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch (err) {
      console.error('AI Reply Error:', err);
      setSuggestions(["Hey! 👋", "Got it!", "Nice!"]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);
  return { suggestions, isLoading, getSuggestions, clearSuggestions };
};
