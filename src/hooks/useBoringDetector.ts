export const useBoringDetector = () => {
  const checkIfBoring = async (messages: any[], currentUserId: string) => {
    // Only check when message count is a multiple of 10 and not zero
    if (messages.length === 0 || messages.length % 10 !== 0) return null;
    
    try {
      const last10 = messages.slice(-10).map(m =>
        `${m.senderId === currentUserId ? 'Me' : 'Them'}: ${m.content || m.text}`
      ).join('\n');

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) return null;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 150,
          messages: [
            {
              role: 'system',
              content: `You analyze chat conversations for energy level. Return ONLY raw JSON, no markdown: { "boringScore": 75, "suggestion": "Play 20 questions!", "emoji": "🎮" }`
            },
            {
              role: 'user',
              content: `Analyze these 10 messages:\n${last10}\n\nRate how boring/repetitive this is from 0-100. Suggest ONE fun activity or topic. Return only JSON: { "boringScore": number, "suggestion": string, "emoji": string }`
            }
          ]
        })
      });

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) return null;
      
      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      console.error('Groq Boring Detector Error:', err);
      return null;
    }
  };

  return { checkIfBoring };
};
