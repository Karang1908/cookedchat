import http from 'node:http';
// Stand-in for the LLM (OpenAI-compatible chat completions) and GIPHY search, so E2E runs need no keys or internet.
http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    if (req.url.startsWith('/v1/gifs/search')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ data: [{ images: { fixed_height: { url: 'https://media1.giphy.com/media/mock/200.gif' } } }] }));
    }
    const body = JSON.parse(raw || '{}');
    if (req.url.startsWith('/api/chat')) {
      // Ollama Cloud's native API
      res.writeHead(200, { 'content-type': 'application/json' });
      // asks for a GIF like Gemma can ("[gif: ...]"): the tag must be stripped from the line and the GIF attached
      return res.end(JSON.stringify({ message: { role: 'assistant', content: `MOCK-OLLAMA(${body.model}): clapping back 🗿 [gif: mic drop]` } }));
    }
    const user = body.messages?.find((m) => m.role === 'user')?.content ?? '';
    const fact = /What just happened: (.*)/.exec(user)?.[1] ?? '?';
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: `MOCK-LLM: ${fact.slice(0, 80)} 💀` } }] }));
  });
}).listen(54331, '127.0.0.1');
