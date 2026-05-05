# GUÍA COMPLETA - Integración Slack + n8n + Nexión

## ✅ LO QUE YA FUNCIONA

### Script de prueba (YA FUNCIONA):
```bash
cd /Users/ub-col-pro-lf4/Documents/Nexión
NEXT_PUBLIC_SLACK_BOT_TOKEN="xoxb-7501228337186-11090506713120-hEJX3ufoW9vFxFKjurHYg5NT" \
node scripts/fetch-all-slack-today.js
```

**Resultado actual:**
- ✅ 2 canales con actividad hoy
- ✅ 7 mensajes leídos
- ✅ `#ubits-general` (6 mensajes)
- ✅ `#help-hubspot` (1 mensaje)

---

## 🔧 CONFIGURAR n8n - PASO A PASO

### 1. Obtener API Key de n8n

1. Ve a: https://egarcia.app.n8n.cloud
2. Clic en **"Settings"** (icono de engranaje)
3. Ve a **"API Keys"**
4. Clic en **"Create an API key"**
5. Nombra: `nexion-integration`
6. Copia la API key (empieza con `n8n_`)

### 2. Configurar Slack App para Events API

1. Ve a: https://api.slack.com/apps
2. Selecciona tu app **"nexion"**
3. En el menú izquierdo: **"Event Subscriptions"**
4. Activar: **"Enable Events"** = ON
5. En **"Request URL"**, pondremos la URL de n8n DESPUÉS
6. En **"Subscribe to bot events"**, agregar:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`
7. Guardar cambios
8. Ve a **"OAuth & Permissions"**
9. Clic en **"Reinstall to Workspace"**

### 3. Importar Workflow a n8n

1. En n8n, ve a **Workflows**
2. Clic en **"Import from File"**
3. Selecciona: `/Users/ub-col-pro-lf4/Documents/Nexión/automation/n8n/workflows/slack-events-complete.json`
4. Una vez importado, **ACTIVAR** el workflow
5. Copia la **"Production URL"** del n8n webhook (algo como: `https://egarcia.app.n8n.cloud/webhook/slack-events`)
6. Ve a Slack App → Event Subscriptions → Pega la URL en **"Request URL"**
7. Guarda cambios
8. Slack hará una verificación (debe salir verde ✅)

### 4. Configurar Variables en n8n

En n8n, ve a **Settings → Environment Variables** y agrega:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
WORKSPACE_ID=id_del_workspace_default
```

### 5. Completar el Workflow en n8n

Una vez importado, edita los nodos:

1. **Save to Supabase**:
   - Method: POST
   - URL: `{{ $env.SUPABASE_URL }}/rest/v1/sources`
   - Headers:
     - `apikey`: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
     - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=minimal`
   - Body:
     ```json
     {
       "workspace_id": "{{ $env.WORKSPACE_ID }}",
       "title": "Slack: {{ $json.channel_id }}",
       "source_type": "meeting",
       "source_origin": "slack",
       "ingest_mode": "slack",
       "current_status": "pending",
       "source_date": "{{ new Date().toISOString().split('T')[0] }}",
       "external_source_id": "{{ $json.channel_id }}",
       "metadata": "{{ JSON.stringify($json) }}"
     }
     ```

2. **Save and Activate** el workflow

---

## 🧪 PROBAR LA INTEGRACIÓN

1. En n8n, ve al workflow → **"Executions"**
2. Envía un mensaje en Slack (cualquier canal donde esté el bot)
3. Verifica que aparezca la ejecución en n8n
4. Verifica en Supabase que se insertó en la tabla `sources`

---

## 📋 RESUMEN DE ARCHIVOS CREADOS

```
/Users/ub-col-pro-lf4/Documents/Nexión/
├── scripts/
│   ├── fetch-all-slack-today.js       ✅ YA FUNCIONA - Prueba rápida
│   ├── test-slack-channel.js            ✅ Prueba canal individual
│   └── setup-n8n-workflow.js          ✅ Configuración automática
├── automation/n8n/workflows/
│   ├── slack-events-workflow.json     ✅ Workflow básico
│   └── slack-events-complete.json    ✅ Workflow completo
└── docs/02-technical/
    └── SLACK_INTEGRATION_SETUP.md     ✅ Documentación
```

---

## 🚨 NOTAS IMPORTANTES

1. **El script `fetch-all-slack-today.js` YA FUNCIONA** - usa eso para ver mensajes de hoy
2. **n8n necesita API Key propia** - no el JWT de MCP
3. **Para DMs** necesitas n8n + Events API configurado
4. **El bot necesita estar invitado** a cada canal donde quieras leer mensajes

---

## ⏭ PRÓXIMOS PASOS

1. ✅ **Inmediato**: Usa `fetch-all-slack-today.js` para ver mensajes de hoy
2. ⏳ **Configurar n8n**: Sigue la guía arriba para capturar TODOS los mensajes
3. ⏳ **UI de Nexión**: Mostrar mensajes en `/day/today`
4. ⏳ **Análisis con Gemini**: Procesar mensajes automáticamente

---

¿Necesitas ayuda con algún paso específico de la configuración?
