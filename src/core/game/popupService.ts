// popup.service.ts
import Methods from "../browser/methods";

export class PopupService {
  constructor(private methods: Methods) {}

  async observePopUp() {
    await this.methods.page.evaluate(() => {
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

    await this.methods.sleep(5000);
    await this.enforcedClosingPopUp();
  }

  async enforcedClosingPopUp() {
    await this.methods.page.evaluate(() => {
      const closeButton = document.querySelector(
        '[class*="Close__CloseIcon"]'
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    });
    const modalContent = this.methods.page.locator(
      '[class^="Modal__ModalContentWrapper"]'
    );
    await modalContent.waitFor({ state: "hidden", timeout: 5000 });
  }
}
