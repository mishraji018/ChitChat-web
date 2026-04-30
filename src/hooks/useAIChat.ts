import { useState } from 'react';

export const useAIChat = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const askAI = async (question: string) => {
    if (!question.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, text: question }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: 'You are Blink AI, a helpful and witty personal assistant. Keep answers concise but friendly. Use emojis.'
            },
            ...newMessages.map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.text
            }))
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Groq API Error:', data);
        throw new Error(data.error?.message || 'Failed to connect to Groq');
      }

      const aiResponse = data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting to my brain. Please check your internet! 🧠🔌' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return { messages, askAI, isLoading, clearChat };
};
