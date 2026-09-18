import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Rendu HTML -> PDF côté serveur, en remplacement de `window.print()` pour
 * les exports imprimables (spec réelle : `window.print()` ne fonctionne
 * quasiment jamais sur Chrome Android — limitation du navigateur, pas un
 * bug applicatif — donc un export qui doit marcher partout doit être
 * généré côté serveur et téléchargé comme un fichier, jamais déclenché via
 * l'API d'impression du navigateur).
 *
 * `@sparticuz/chromium` fournit un binaire Chromium autonome pensé pour les
 * environnements serverless/conteneurs contraints (Lambda, Railway...) —
 * pas besoin d'installer de dépendances système via le builder (Nixpacks/
 * Railpack) comme l'exigerait un Chromium "classique". `puppeteer-core` est
 * la paire officiellement testée par les mainteneurs de ce paquet (Playwright
 * avec un executablePath externe n'est pas garanti par ses propres mainteneurs).
 *
 * Un seul navigateur headless est lancé paresseusement et réutilisé entre
 * les requêtes (le lancer prend ~1-2s, un gaspillage à répéter à chaque
 * export) ; relancé automatiquement s'il crashe ou se déconnecte.
 */
@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRenderService.name);
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      if (browser.connected) return browser;
      this.browserPromise = null;
    }
    this.browserPromise = this.launchBrowser();
    return this.browserPromise;
  }

  private async launchBrowser(): Promise<Browser> {
    const executablePath = await chromium.executablePath();
    this.logger.log(`Lancement du navigateur headless pour la génération de PDF (${executablePath})`);
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
    browser.on('disconnected', () => {
      this.logger.warn('Navigateur headless déconnecté — relancé à la prochaine génération de PDF.');
    });
    return browser;
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy() {
    if (!this.browserPromise) return;
    try {
      const browser = await this.browserPromise;
      await browser.close();
    } catch {
      // Le process se termine de toute façon — un navigateur déjà mort n'est pas une erreur à remonter.
    }
  }
}
