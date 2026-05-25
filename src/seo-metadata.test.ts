import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import faviconSvg from '../public/favicon.svg?raw';
import robotsTxt from '../public/robots.txt?raw';
import sitemapXml from '../public/sitemap.xml?raw';

const siteOrigin = 'https://scene-editor.pokokit.com';
const socialImageUrl = `${siteOrigin}/assets/pokopia_image_sources/pokemon_portraits/063-ditto.png`;

describe('static SEO metadata', () => {
  it('publishes English root metadata for search and social previews', () => {
    expect(indexHtml).toContain('<html lang="en">');
    expect(indexHtml).toContain('<title>Pokopia Scene Editor | 5x5 Layout Planner</title>');
    expect(indexHtml).toContain(`<link rel="canonical" href="${siteOrigin}/" />`);
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('7x7 rule-aware workbench');
    expect(indexHtml).toContain('property="og:title" content="Pokopia Scene Editor | 5x5 Layout Planner"');
    expect(indexHtml).toContain(`property="og:url" content="${siteOrigin}/"`);
    expect(indexHtml).toContain(`property="og:image" content="${socialImageUrl}"`);
    expect(indexHtml).toContain('name="twitter:card" content="summary"');
    expect(indexHtml).toContain(`name="twitter:image" content="${socialImageUrl}"`);
    expect(indexHtml).toContain('"@type": "WebApplication"');
    expect(indexHtml).toContain('"inLanguage": ["en", "zh-CN"]');
  });

  it('publishes crawler discovery files and the favicon asset', () => {
    expect(robotsTxt).toContain('User-agent: *');
    expect(robotsTxt).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
    expect(sitemapXml).toContain(`<loc>${siteOrigin}/</loc>`);
    expect(faviconSvg).toContain('<svg');
    expect(faviconSvg).toContain('aria-label="Pokopia Scene Editor"');
  });
});
