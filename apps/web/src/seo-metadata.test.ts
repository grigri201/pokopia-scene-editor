import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import staticHeaders from '../public/_headers?raw';
import faviconSvg from '../public/favicon.svg?raw';
import robotsTxt from '../public/robots.txt?raw';
import sitemapXml from '../public/sitemap.xml?raw';
import socialPreviewSvg from '../public/assets/social-preview.svg?raw';
import socialPreviewPngUrl from '../public/assets/social-preview.png?url';

const siteOrigin = 'https://scene-editor.pokokit.com';
const socialImageUrl = `${siteOrigin}/assets/social-preview.png`;
const targetKeywordTheme = [
  'pokopia scene builder',
  'layout helper',
  'tool',
  'tools kit',
  'workbench',
] as const;
const forbiddenIndexableStateMarkers = [
  'scene_id=',
  'auth',
  'session',
  'access_token',
  'refresh_token',
  'owner_user_id',
  'private scene',
] as const;

function parseIndexDocument(): Document {
  return new DOMParser().parseFromString(indexHtml, 'text/html');
}

function metaNameContent(document: Document, name: string): string | null {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
}

function metaPropertyContent(document: Document, property: string): string | null {
  return document.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? null;
}

function parseJsonLd(document: Document): Record<string, unknown> {
  const text = document.querySelector('script[type="application/ld+json"]')?.textContent ?? '';

  return JSON.parse(text) as Record<string, unknown>;
}

describe('static SEO metadata', () => {
  it('publishes English root metadata for search and social previews', () => {
    const document = parseIndexDocument();
    const metadataText = [
      document.title,
      metaNameContent(document, 'description'),
      metaNameContent(document, 'keywords'),
      metaPropertyContent(document, 'og:title'),
      metaPropertyContent(document, 'og:description'),
      metaNameContent(document, 'twitter:title'),
      metaNameContent(document, 'twitter:description'),
    ]
      .join(' ')
      .toLowerCase();

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Pokopia Scene Builder | Layout Helper Tool');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${siteOrigin}/`);
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg');
    expect(metaNameContent(document, 'description')).toContain('Pokopia scene builder');
    expect(metaNameContent(document, 'description')).toContain('layout helper');
    expect(metaNameContent(document, 'description')).toContain('tools kit');
    expect(metaNameContent(document, 'keywords')).toContain('Pokopia scene builder');
    expect(metaNameContent(document, 'theme-color')).toBe('#f6d74f');
    for (const keyword of targetKeywordTheme) {
      expect(metadataText).toContain(keyword);
    }
    expect(metaPropertyContent(document, 'og:type')).toBe('website');
    expect(metaPropertyContent(document, 'og:site_name')).toBe('pokokit');
    expect(metaPropertyContent(document, 'og:title')).toBe('Pokopia Scene Builder | Layout Helper Tool');
    expect(metaPropertyContent(document, 'og:description')).toContain('Pokopia scene builder');
    expect(metaPropertyContent(document, 'og:url')).toBe(`${siteOrigin}/`);
    expect(metaPropertyContent(document, 'og:image')).toBe(socialImageUrl);
    expect(metaPropertyContent(document, 'og:image:type')).toBe('image/png');
    expect(metaPropertyContent(document, 'og:image:width')).toBe('1200');
    expect(metaPropertyContent(document, 'og:image:height')).toBe('630');
    expect(metaPropertyContent(document, 'og:image:alt')).toBe(
      'Pokopia Scene Editor workbench preview with a grid, builder tools, and layout helper panels',
    );
    expect(metaNameContent(document, 'twitter:card')).toBe('summary_large_image');
    expect(metaNameContent(document, 'twitter:title')).toBe('Pokopia Scene Builder | Layout Helper Tool');
    expect(metaNameContent(document, 'twitter:description')).toContain('layout helper');
    expect(metaNameContent(document, 'twitter:image')).toBe(socialImageUrl);
    expect(metaNameContent(document, 'twitter:image:alt')).toBe(
      'Pokopia Scene Editor workbench preview with a grid, builder tools, and layout helper panels',
    );
  });

  it('publishes parseable WebApplication JSON-LD for the root app only', () => {
    const jsonLd = parseJsonLd(parseIndexDocument());

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${siteOrigin}/#app`,
      name: 'Pokopia Scene Editor',
      url: `${siteOrigin}/`,
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any modern browser',
      isAccessibleForFree: true,
      image: socialImageUrl,
      publisher: {
        '@type': 'Organization',
        name: 'pokokit',
        url: 'https://www.pokokit.com/',
      },
    });
    expect(jsonLd.description).toEqual(expect.stringContaining('Pokopia scene builder'));
    expect(jsonLd.description).toEqual(expect.stringContaining('layout helper'));
    expect(jsonLd.featureList).toEqual(
      expect.arrayContaining([
        'Scene builder workbench',
        'Layout helper tools',
        'Building layer management',
        'Item placement and instance editing',
        'Skill marker annotation',
        'Preview and image export',
      ]),
    );
    expect(jsonLd.url).not.toContain('?');
  });

  it('keeps crawler discovery root-only and rejects indexable user state', () => {
    const sitemapDocument = new DOMParser().parseFromString(sitemapXml, 'application/xml');

    expect(robotsTxt).toContain('User-agent: *');
    expect(robotsTxt).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
    expect(
      Array.from(sitemapDocument.querySelectorAll('loc')).map((element) => element.textContent),
    ).toEqual([`${siteOrigin}/`]);
    expect(
      Array.from(sitemapDocument.querySelectorAll('changefreq')).map((element) => element.textContent),
    ).toEqual(['weekly']);
    expect(
      Array.from(sitemapDocument.querySelectorAll('priority')).map((element) => element.textContent),
    ).toEqual(['0.8']);
    for (const forbiddenMarker of forbiddenIndexableStateMarkers) {
      expect(indexHtml.toLowerCase()).not.toContain(forbiddenMarker);
      expect(sitemapXml.toLowerCase()).not.toContain(forbiddenMarker);
      expect(robotsTxt.toLowerCase()).not.toContain(forbiddenMarker);
    }
  });

  it('publishes the favicon and stable social preview assets', () => {
    expect(faviconSvg).toContain('<svg');
    expect(faviconSvg).toContain('aria-label="Pokopia Scene Editor"');
    expect(socialPreviewPngUrl).toContain('social-preview.png');
    expect(socialPreviewSvg).toContain('<svg');
    expect(socialPreviewSvg).toContain('role="img"');
    expect(socialPreviewSvg).toContain('Pokopia Scene Editor');
    expect(socialPreviewSvg).toContain('Scene builder');
    expect(socialPreviewSvg).toContain('Layout helper');
  });

  it('publishes immutable static cache rules for material artwork', () => {
    expect(staticHeaders).toMatch(
      /\/assets\/pokopia_image_sources\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/,
    );
    expect(staticHeaders).toMatch(
      /\/assets\/asset-thumbnails\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/,
    );
    expect(staticHeaders).toMatch(
      /\/assets\/social-preview\.svg\n\s+Cache-Control: public, max-age=604800, must-revalidate/,
    );
    expect(staticHeaders).toMatch(
      /\/assets\/social-preview\.png\n\s+Cache-Control: public, max-age=604800, must-revalidate/,
    );
  });

  it('keeps the favicon revalidating after a short browser cache window', () => {
    expect(staticHeaders).toContain('/favicon.svg');
    expect(staticHeaders).toMatch(/\/favicon\.svg\n\s+Cache-Control: public, max-age=604800, must-revalidate/);
  });
});
