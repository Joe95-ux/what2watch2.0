<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>What2Watch Sitemap</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #0a0f0d;
            --card: #111916;
            --border: #1f2e28;
            --text: #ecfdf5;
            --muted: #86efac;
            --accent: #10b981;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: linear-gradient(145deg, #0a0f0d 0%, #0f1a16 45%, #052e1f 100%);
            color: var(--text);
            min-height: 100vh;
            padding: 2rem 1rem 3rem;
          }
          .wrap { max-width: 1100px; margin: 0 auto; }
          h1 { margin: 0 0 0.35rem; font-size: 1.75rem; }
          .sub { color: var(--muted); margin: 0 0 1.5rem; }
          .badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: var(--accent);
            padding: 0.25rem 0.65rem;
            border-radius: 999px;
            font-size: 0.85rem;
            margin-bottom: 1rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
          }
          th, td {
            text-align: left;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }
          th {
            background: rgba(16, 185, 129, 0.08);
            color: var(--muted);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          tr:last-child td { border-bottom: none; }
          a { color: #6ee7b7; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .muted { color: #9ca3af; font-size: 0.85rem; }
          footer { margin-top: 1.25rem; color: var(--muted); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <span class="badge">XML Sitemap</span>
          <h1>What2Watch URLs</h1>
          <p class="sub">Human-readable view for browsers. Search engines read the raw XML.</p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Last modified</th>
                <th>Change freq.</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td>
                    <a>
                      <xsl:attribute name="href">
                        <xsl:value-of select="s:loc" />
                      </xsl:attribute>
                      <xsl:value-of select="s:loc" />
                    </a>
                  </td>
                  <td class="muted">
                    <xsl:value-of select="s:lastmod" />
                  </td>
                  <td class="muted">
                    <xsl:value-of select="s:changefreq" />
                  </td>
                  <td class="muted">
                    <xsl:value-of select="s:priority" />
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <footer>
            <xsl:value-of select="count(s:urlset/s:url)" /> URLs in this sitemap.
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
