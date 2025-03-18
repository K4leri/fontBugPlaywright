// popup.service.ts
import { Page } from "playwright";

export class PopupService {
  constructor(private page: Page) {}

  async observePopUp() {
    await this.page.evaluate(() => {
      const observer = new MutationObserver(() => {
        const closeButton = document.querySelector(
          '[class*="Close__CloseIcon"]'
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return observer;
    });

    // await this.methods.sleep(5000);
    await this.enforcedClosingPopUp();
  }

  async enforcedClosingPopUp() {
    await this.page.evaluate(() => {
      const closeButton = document.querySelector(
        '[class*="Close__CloseIcon"]'
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    });

    const modalContent = this.page.locator(
      '[class^="Modal__ModalContentWrapper"]'
    );
    await modalContent.waitFor({ state: "hidden", timeout: 5000 });
  }
}
