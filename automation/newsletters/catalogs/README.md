# Catálogos de fuentes de Boletines

Un archivo JSON por boletín. Son la fuente de verdad versionada de las fuentes; el SQL de seed se
genera a partir de ellos (`scripts/newsletters/build-seed.ts`).

## Verificar un catálogo

```bash
npx vite-node scripts/newsletters/check-sources.ts -- automation/newsletters/catalogs/<id>.json
```

Veredictos: `ok_feed` (RSS/Atom con items), `ok_html` (página HTML de la que se extraen links),
`stale` (feed sin publicaciones en 90+ días), `empty` (responde pero no se extrae nada), `broken`
(4xx/5xx o sin respuesta). Para lo que no es `ok_feed`, intenta descubrir un feed alternativo.

## Formato

```jsonc
{
  "newsletter": {
    "id": "hr-radar",                       // kebab-case, estable
    "name": "HR Radar",
    "description": "…",                      // una frase, español
    "schedule_label": "Miércoles · 8:00 a. m. (Bogotá)",
    "slack_channel_id": "C0A34HW4HGR",
    "model": "claude-haiku-4-5-20251001"
  },
  "sources": [
    {
      "source_key": "hr_dive",               // snake_case, único en el catálogo
      "name": "HR Dive",
      "url": "https://www.hrdive.com/feeds/news/",
      "source_type": "RSS",                  // RSS | HTML | SITEMAP | REDDIT (cómo se lee, no qué contiene)
      "category": "media",                   // agrupación editorial del boletín
      "priority": "high",                    // high | medium | low
      "max_items": 5,                        // 1–20
      "is_active": true,                     // false si está roto o es ruidoso; nunca borrar una fuente útil
      "notes": "Por qué está y qué aporta. Español.",
      "metadata": { }                        // campos propios del boletín (competidor, producto, proceso, tags…)
    }
  ],
  "report": {
    "checked_at": "2026-09-29",
    "summary": { "ok_feed": 0, "ok_html": 0, "stale": 0, "empty": 0, "broken": 0 },
    "fixed":   [{ "source_key": "", "old_url": "", "new_url": "", "reason": "" }],
    "deactivated": [{ "source_key": "", "url": "", "reason": "" }],
    "added":   [{ "source_key": "", "url": "", "reason": "" }],
    "duplicates_removed": 0,
    "notes": [""]
  }
}
```

## Criterios de calidad

- Preferir la fuente **oficial** o el feed RSS/Atom antes que scrapear HTML.
- Una fuente se activa solo si el chequeo la deja en `ok_feed` u `ok_html` con items útiles.
- Una fuente rota se arregla (URL nueva) o se desactiva con el motivo; no se borra.
- Sin duplicados: misma URL canónica = una sola fila.
- Las fuentes nuevas deben ser de alta calidad y alto potencial (medios reconocidos, oficiales,
  analistas de referencia), no agregadores de spam ni contenido SEO genérico.
