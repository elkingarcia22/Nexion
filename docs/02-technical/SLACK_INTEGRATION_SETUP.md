# Configuración de Slack para Nexión

## 1. Configurar Slack App para Events API

### Paso 1: Ir a Slack Apps
https://api.slack.com/apps

### Paso 2: Seleccionar tu app "nexion"

### Paso 3: Configurar Event Subscriptions
1. En el menú izquierdo, clic en **"Event Subscriptions"**
2. Activar: **"Enable Events"** = ON
3. En **"Request URL"**, poner la URL de n8n:
   ```
   https://egarcia.app.n8n.cloud/webhook/slack-events
   ```
   *(Esto se configurará en n8n después)**

### Paso 4: Suscribirse a eventos
En **"Subscribe to bot events"**, agregar:
- `message.channels` - Mensajes en canales públicos
- `message.groups` - Mensajes en canales privados
- `message.im` - Mensajes directos (DMs)
- `message.mpim` - Mensajes en grupos DM

### Paso 5: Guardar cambios
Clic en **"Save Changes"**

### Paso 6: Reinstalar la app
- Ve a **"OAuth & Permissions"**
- Clic en **"Reinstall to Workspace"**
- Autorizar los nuevos permisos

---

## 2. Configurar n8n Workflow

### Paso 1: Importar el Workflow
1. En n8n, ir a **Workflows**
2. Clic en **"Import from File"**
3. Seleccionar el archivo: `automation/n8n/workflows/slack-events-workflow.json`

### Paso 2: Configurar Credenciales en n8n
En **Credentials**, agregar:
- **Supabase**: URL y Service Role Key
- **Gemeni API**: API Key (para análisis futuro)

### Paso 3: Configurar Variables de Entorno en n8n
En **Settings → Environment Variables**, agregar:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
WORKSPACE_ID=id_del_workspace_default
```

### Paso 4: Activar el Workflow
1. Clic en **"Activate"**
2. Copiar la **"Production URL"** del webhook
3. Volver a Slack App y pegar la URL en **"Request URL"**

---

## 3. Estructura de Datos en Supabase

Los mensajes se guardarán en la tabla `sources`:

```sql
INSERT INTO sources (
  workspace_id,
  title,
  source_type,
  source_origin,
  ingest_mode,
  current_status,
  source_date,
  external_source_id,
  metadata
) VALUES (
  'id-workspace',
  'Slack: #canal',
  'meeting',
  'slack',
  'slack',
  'pending',
  CURRENT_DATE,
  'C123456',
  '{"channel": "...", "user": "...", "text": "...", "ts": "..."}'
);
```

---

## 4. Verificar la Integración

### Probar:
1. En n8n, ve al workflow
2. Clic en **"Executions"**
3. Envía un mensaje en Slack (cualquier canal donde esté el bot)
4. Verifica que aparezca la ejecución en n8n
5. Verifica en Supabase que se insertó el registro en `sources`

---

## 5. Troubleshooting

### Error: "Request URL challenged failed"
- Asegúrate de que la URL de n8n esté activa
- Verifica que el webhook de n8n responda con el `challenge` de Slack

### Error: "Events not received"
- Verifica que el bot esté invitado al canal
- Confirma que los eventos estén suscritos en Slack App
- Revisa los logs en n8n

### Error: "Supabase insert failed"
- Verifica las variables de entorno en n8n
- Confirma que el `workspace_id` exista en la tabla `workspaces`
- Revisa los permisos de RLS en Supabase

---

## 6. Próximos Pasos

1. ✅ Configurar Slack Events API
2. ✅ Activar workflow en n8n
3. ⏳ Crear el análisis con Gemeni (futuro)
4. ⏳ Mostrar en la UI de Nexión (futuro)
