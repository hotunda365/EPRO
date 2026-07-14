const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const systemContent = 'You are a helpful assistant for EPRO TELECOM. Answer questions about published telecom services, products, and company information.';

const validateMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) return null;
  const validRoles = new Set(['user', 'assistant']);
  const normalized = [];
  for (const message of messages) {
    if (!message || !validRoles.has(message.role) || typeof message.content !== 'string') return null;
    const content = message.content.trim();
    if (!content || content.length > 4000) return null;
    normalized.push({ role: message.role, content });
  }
  return normalized;
};

/**
 * POST /api/chat
 * Body: { messages: [{ role, content }], systemPrompt?: string }
 */
router.post('/', async (req, res) => {
  const messages = validateMessages(req.body.messages);

  if (!messages) {
    return res.status(400).json({ error: 'A valid messages array is required' });
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'grok-4-5',
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
    });

    res.json({
      reply: completion.choices[0].message.content,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('Grok API error:', error.message);
    res.status(502).json({ error: 'AI service error', detail: error.message });
  }
});

/**
 * POST /api/chat/stream
 * Streams the response as Server-Sent Events
 */
router.post('/stream', async (req, res) => {
  const messages = validateMessages(req.body.messages);

  if (!messages) {
    return res.status(400).json({ error: 'A valid messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.chat.completions.create({
      model: 'grok-4-5',
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Grok stream error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
