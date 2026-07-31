import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { chromium, Browser, BrowserContext } from "playwright";

@Injectable()
export class BrowserManagerService implements OnModuleDestroy {
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    this.browser = await chromium.launch({
      headless: true,
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

    return this.browser;
  }

  async newContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    return browser.newContext({
      viewport: {
        width: Math.round(1280 + Math.random() * 200),
        height: Math.round(720 + Math.random() * 100),
      },
      locale: "ru-RU",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
  }

  async resetBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.resetBrowser();
  }
}
