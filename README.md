# 🚀 PCPUMA AI STUDIO (MVP)

Plataforma inteligente y privada de **Chat con Agentes Especializados** y centro de **Consumo de API de Inteligencia Artificial**, impulsada por el motor de alto rendimiento **Alibaba Cloud DashScope (Qwen-Max / Qwen-Plus / Qwen-Turbo)** con compatibilidad OpenAI v1.

---

## 🌟 Características Principales

1. **Agentes Inteligentes Preconfigurados**:
   - 💻 **PCPUMA Code Architect**: Generación, auditoría, refactorización, scripts (PowerShell, Bash, Python) y diseño de APIs y bases de datos.
   - 📑 **PCPUMA Anexos Técnicos & Cotizaciones**: Elaboración técnica de instructivos de cotización para proveedores (RFQ/RFP), especificaciones de bienes/servicios y matrices comparativas con formato tabular.
   - 🏛️ **PCPUMA Gestor Administrativo**: Términos de Referencia (TDR), actas de entrega/recepción, minutas de reunión con compromisos, memorándums y oficios corporativos.
   - ⚡ **PCPUMA Asistente General**: Razonamiento multipropósito, análisis y resúmenes.

2. **Creador Dinámico de Agentes**:
   - Crea agentes con System Prompts a la medida, temperatura regulable, modelo asignado y preguntas rápidas.
   - Persistencia local en archivo JSON (`data/agents.json`).

3. **Centro de Integración API (Botón "Consumir API")**:
   - Visualización y copia en 1-clic del Token, Host, Endpoint compatible con OpenAI y Endpoint DashScope.
   - Snippets listos para usar en:
     - **Python** (SDK oficial OpenAI con `base_url`)
     - **Python** (Librería `requests`)
     - **cURL** (Bash / Terminal)
     - **Node.js** (SDK OpenAI y `fetch`)
     - **PowerShell** (`Invoke-RestMethod`)

4. **Interfaz Moderna & Productiva**:
   - Streaming en tiempo real tipo máquina de escribir (SSE).
   - Renderizado Markdown con resaltado de sintaxis y tablas estructuradas.
   - Botón para **Exportar Respuestas / Chats como Documentos Markdown (.md)**.
   - Monitor de estado de conexión y latencia hacia la API en tiempo real.

---

## 🔑 Datos de Conexión de la API PCPUMA

- **API Host:** `ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com`
- **OpenAI Compatible Endpoint:** `https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
- **DashScope Endpoint:** `https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/api/v1`
- **Modelos Disponibles:** `qwen-max`, `qwen-plus`, `qwen-turbo`

---

## ⚡ Cómo Iniciar la Aplicación

Abre una terminal en la carpeta del proyecto y ejecuta:

```powershell
npm start
```

Luego abre tu navegador en:
👉 **`http://localhost:3000`**

---

## 💻 Ejemplos de Consumo en otros Proyectos

### 🐍 Python (usando la librería estándar `openai`)
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ws-H.DHDDXDX.XjLB.MEYCIQCfJDa_sSGqBbCMjOKYNG85kjB6m4yLEODkwREfVOsEhgIhAOd2v_5KqmP8cTgLlBK7ea0CaNkK0DxvLyPF3Z7AI0e1",
    base_url="https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
)

response = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {"role": "system", "content": "Eres PCPUMA AI."},
        {"role": "user", "content": "Genera un anexo técnico para adquisición de equipos."}
    ],
    temperature=0.3
)

print(response.choices[0].message.content)
```

### 🌐 cURL
```bash
curl --location 'https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer sk-ws-H.DHDDXDX.XjLB.MEYCIQCfJDa_sSGqBbCMjOKYNG85kjB6m4yLEODkwREfVOsEhgIhAOd2v_5KqmP8cTgLlBK7ea0CaNkK0DxvLyPF3Z7AI0e1' \
--data '{
  "model": "qwen-plus",
  "messages": [
    {"role": "user", "content": "Hola PCPUMA AI"}
  ]
}'
```
