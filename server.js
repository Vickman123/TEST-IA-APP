require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.PCPUMA_API_KEY || 'sk-ws-H.DHDDXDX.XjLB.MEYCIQCfJDa_sSGqBbCMjOKYNG85kjB6m4yLEODkwREfVOsEhgIhAOd2v_5KqmP8cTgLlBK7ea0CaNkK0DxvLyPF3Z7AI0e1';
const API_HOST = process.env.PCPUMA_API_HOST || 'ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com';
const COMPATIBLE_ENDPOINT = process.env.PCPUMA_COMPATIBLE_ENDPOINT || 'https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const DASHSCOPE_ENDPOINT = process.env.PCPUMA_DASHSCOPE_ENDPOINT || 'https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/api/v1';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const AGENTS_FILE = path.join(__dirname, 'data', 'agents.json');
const CHATS_FILE = path.join(__dirname, 'data', 'chats.json');

function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// 1. Endpoint: Estado del servicio y prueba de conectividad
app.get('/api/status', async (req, res) => {
  const start = Date.now();
  const testPayload = JSON.stringify({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 5
  });

  const requestOptions = {
    hostname: API_HOST,
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    timeout: 8000
  };

  const reqTest = https.request(requestOptions, (apiRes) => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => {
      const latency = Date.now() - start;
      if (apiRes.statusCode === 200) {
        res.json({
          status: 'online',
          latency: `${latency}ms`,
          host: API_HOST,
          activeModel: 'qwen-plus',
          statusCode: apiRes.statusCode
        });
      } else {
        res.status(apiRes.statusCode).json({
          status: 'error',
          statusCode: apiRes.statusCode,
          message: body
        });
      }
    });
  });

  reqTest.on('error', (err) => {
    res.status(500).json({
      status: 'offline',
      error: err.message
    });
  });

  reqTest.write(testPayload);
  reqTest.end();
});

// 2. Endpoint: Datos y Snippets para Consumir la API en otros proyectos
app.get('/api/credentials', (req, res) => {
  res.json({
    credentials: {
      apiKey: API_KEY,
      apiHost: API_HOST,
      compatibleEndpoint: COMPATIBLE_ENDPOINT,
      dashScopeEndpoint: DASHSCOPE_ENDPOINT,
      supportedModels: [
        { id: 'qwen-max', name: 'Qwen Max (Alto Razonamiento y Lógica Compleja)', recommended: 'Código, TDR y Análisis Profundo' },
        { id: 'qwen-plus', name: 'Qwen Plus (Equilibrado, Rápido y Versátil)', recommended: 'Documentos, Anexos Técnicos y Cotizaciones' },
        { id: 'qwen-turbo', name: 'Qwen Turbo (Ultra Rápido y Económico)', recommended: 'Tareas simples, clasificación y resúmenes' }
      ]
    },
    snippets: {
      curl: `curl --location '${COMPATIBLE_ENDPOINT}/chat/completions' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer ${API_KEY}' \\
--data '{
  "model": "qwen-plus",
  "messages": [
    {"role": "system", "content": "Eres un asistente experto de PCPUMA AI."},
    {"role": "user", "content": "Genera un instructivo de cotización para servicios cloud"}
  ],
  "temperature": 0.3
}'`,

      python_openai: `from openai import OpenAI

# PCPUMA AI - Cliente OpenAI Compatible
client = OpenAI(
    api_key="${API_KEY}",
    base_url="${COMPATIBLE_ENDPOINT}"
)

response = client.chat.completions.create(
    model="qwen-max",
    messages=[
        {"role": "system", "content": "Eres PCPUMA Code Architect."},
        {"role": "user", "content": "Crea una función en Python para procesar anexos técnicos."}
    ],
    temperature=0.2
)

print(response.choices[0].message.content)`,

      python_requests: `import requests

url = "${COMPATIBLE_ENDPOINT}/chat/completions"
headers = {
    "Authorization": "Bearer ${API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": "qwen-plus",
    "messages": [
        {"role": "user", "content": "Elabora un anexo técnico para adquisición de equipos."}
    ],
    "temperature": 0.3
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["choices"][0]["message"]["content"])`,

      nodejs_openai: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${API_KEY}',
  baseURL: '${COMPATIBLE_ENDPOINT}'
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'qwen-max',
    messages: [
      { role: 'system', content: 'Eres PCPUMA Code Architect' },
      { role: 'user', content: 'Crea una API en Express para procesar cotizaciones.' }
    ],
    temperature: 0.2
  });

  console.log(completion.choices[0].message.content);
}

main();`,

      nodejs_fetch: `const response = await fetch('${COMPATIBLE_ENDPOINT}/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${API_KEY}'
  },
  body: JSON.stringify({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: 'Hola PCPUMA AI' }],
    temperature: 0.3
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,

      powershell: `$headers = @{
    "Authorization" = "Bearer ${API_KEY}"
    "Content-Type"  = "application/json"
}

$body = @{
    model = "qwen-plus"
    messages = @(
        @{ role = "user"; content = "Hola PCPUMA AI, confírmame tu estado." }
    )
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri "${COMPATIBLE_ENDPOINT}/chat/completions" -Method Post -Headers $headers -Body $body
$response.choices[0].message.content`
    }
  });
});

// 3. Endpoint: Gestión de Agentes
app.get('/api/agents', (req, res) => {
  const agents = readJson(AGENTS_FILE, []);
  res.json(agents);
});

app.post('/api/agents', (req, res) => {
  const { name, tagline, systemPrompt, model, temperature, icon, color, category, quickPrompts } = req.body;
  if (!name || !systemPrompt) {
    return res.status(400).json({ error: 'Nombre y System Prompt son obligatorios' });
  }

  const agents = readJson(AGENTS_FILE, []);
  const newAgent = {
    id: 'agent-' + Date.now(),
    name,
    tagline: tagline || 'Agente Especializado Personalizado',
    systemPrompt,
    model: model || 'qwen-plus',
    temperature: parseFloat(temperature) || 0.3,
    icon: icon || 'cpu',
    color: color || 'indigo',
    category: category || 'custom',
    quickPrompts: quickPrompts && quickPrompts.length > 0 ? quickPrompts : [
      '¿Cómo me puedes ayudar con este tema?',
      'Dame un ejemplo práctico'
    ]
  };

  agents.push(newAgent);
  writeJson(AGENTS_FILE, agents);
  res.status(201).json(newAgent);
});

// 4. Endpoint: Chats
app.get('/api/chats', (req, res) => {
  const chats = readJson(CHATS_FILE, []);
  res.json(chats);
});

app.post('/api/chats', (req, res) => {
  const chat = req.body;
  if (!chat.id) chat.id = 'chat-' + Date.now();
  chat.updatedAt = new Date().toISOString();

  let chats = readJson(CHATS_FILE, []);
  const index = chats.findIndex(c => c.id === chat.id);
  if (index >= 0) {
    chats[index] = chat;
  } else {
    chats.unshift(chat);
  }
  writeJson(CHATS_FILE, chats);
  res.json(chat);
});

app.delete('/api/chats/:id', (req, res) => {
  let chats = readJson(CHATS_FILE, []);
  chats = chats.filter(c => c.id !== req.params.id);
  writeJson(CHATS_FILE, chats);
  res.json({ success: true });
});

// 5. Endpoint Principal: Chat SSE Streaming o JSON
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'qwen-plus', temperature = 0.3, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const payload = JSON.stringify({
      model: model,
      messages: messages,
      temperature: Number(temperature),
      stream: Boolean(stream)
    });

    const requestOptions = {
      hostname: API_HOST,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const proxyReq = https.request(requestOptions, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
          let errBody = '';
          proxyRes.on('data', d => errBody += d);
          proxyRes.on('end', () => {
            res.write('data: ' + JSON.stringify({ error: errBody || 'Error upstream' }) + '\n\n');
            res.end();
          });
          return;
        }

        proxyRes.on('data', (chunk) => {
          res.write(chunk);
        });

        proxyRes.on('end', () => {
          res.end();
        });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy stream error:', err);
        res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
        res.end();
      });

      proxyReq.write(payload);
      proxyReq.end();

    } else {
      const proxyReq = https.request(requestOptions, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            res.status(proxyRes.statusCode).json(parsed);
          } catch (e) {
            res.status(proxyRes.statusCode).send(body);
          }
        });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: err.message });
      });

      proxyReq.write(payload);
      proxyReq.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log('   🚀 PCPUMA AI STUDIO INICIADO EXITOSAMENTE');
  console.log(`   URL Local: http://localhost:${PORT}`);
  console.log(`   API Host:  ${API_HOST}`);
  console.log(`   Endpoint:  ${COMPATIBLE_ENDPOINT}`);
  console.log('====================================================');
});
