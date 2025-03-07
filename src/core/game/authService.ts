// auth.service.ts
import { Accounts } from "../../types/general";
import Methods from "../browser/methods";
import { config } from "../browser/config";
import { PopupService } from "./popupService";
import logger from "../../unit/logger";

export class AuthService {
  constructor(private methods: Methods, private popupService: PopupService) {}

  async logIntoAccount(account: Accounts) {
    let loginAttempted = false;
    const result = await this.waitForLoginWindow();

    if (!config.options.onlyRead && result === "register") {
      if (!account || !account.login || !account.password) {
        throw new Error(
          `[${this.methods.threadId}] Invalid account credentials`
        );
      }
      loginAttempted = true;
      logger.info(
        `[${this.methods.threadId}] Пытаюсь войти в аккаунт ${account.login}:${account.password}`
      );

      await this.fillLoginForm(account);
      await this.checkCaptcha();
    }

    logger.warn(
      config.options.onlyRead
        ? `[${this.methods.threadId}] Парсер работает в режиме чтения выпдающих цифр`
        : `[${this.methods.threadId}] Закончил со входом`,
      { threadId: this.methods.threadId }
    );

    await this.methods.sleep(10000);
    return loginAttempted;
  }

  private async waitForLoginWindow() {
    const balanceElement = this.methods.page
      .locator("[class*=DesktopBalance__BalanceAmount]")
      .first();
    const registerButton = this.methods.page.locator(
      '//button[text()="Регистрация"]'
    );

    return await Promise.race([
      balanceElement
        .waitFor({ state: "visible" })
        .then(() => "balance" as const),
      registerButton
        .waitFor({ state: "visible" })
        .then(() => "register" as const),
    ]);
  }

  private async fillLoginForm(account: Accounts) {
    await this.popupService.enforcedClosingPopUp();
    const form = this.methods.page.locator(
      '[class*="Modal__ModalContentWrapper"]'
    );

    while (!(await form.isVisible())) {
      await this.methods.page.locator('button:has-text("Вход")').click();
      await this.methods.sleep(500);
    }

    const phoneInput = this.methods.page
      .locator('input[type="tel"], input[name*="phone"]')
      .first();
    await phoneInput.fill("9176552121");

    const passwordInput = this.methods.page.locator(
      'input[type="password"], input[name="password"]'
    );
    await passwordInput.fill(account.password);
  }

  private async checkCaptcha() {
    const iframe = this.methods.page.frameLocator('iframe[title="reCAPTCHA"]');
    const checkboxExists = await iframe
      .locator("#recaptcha-anchor")
      .count()
      .catch(() => false);

    const submit = this.methods.page.locator('[type="submit"]');
    if (!checkboxExists && !(await submit.isDisabled())) {
      await submit.click();
      return;
    }

    await iframe.locator("#recaptcha-anchor").click();

    const verified = await Promise.race([
      iframe
        .locator(".recaptcha-checkbox-checked")
        .waitFor()
        .then(() => true),
      ,
      iframe
        .locator('iframe[title*="challenge"]')
        .waitFor()
        .then(() => false),
      ,
    ]);

    if (verified) {
      await this.methods.page.locator('[type="submit"]').click();
    } else {
      // ручное ожидание ввода капчи
      const modalContent = this.methods.page.locator(
        '[class^="Modal__ModalContentWrapper"]'
      );

      await modalContent.waitFor({ state: "hidden", timeout: 999999999 });
    }
  }
}
