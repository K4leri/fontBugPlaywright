// import fs from "fs";
// import resemble from "resemblejs";
// import BrowserAutomation from "./base";
// import {
//   Accounts,
//   FileType,
//   mainLogo,
//   numbers,
//   textOnBord,
// } from "../../types/general";
// import { imageComparator } from "../image/imageComperator";
// import { generateHeapSnapshot } from "../../unit/heapSnapshot";
// import logger from "../../unit/logger";
// import { config } from "./config";

// export default class Methods extends BrowserAutomation {
//   constructor(threadId: number) {
//     super(threadId);
//     setInterval(() => {
//       this.saveContext(threadId);
//     }, 60 * 1000 * 15);

//     process.on("SIGUSR2", () => {
//       generateHeapSnapshot();
//     });
//   }

//   private async observePopUp() {
//     await this.page.evaluate(() => {
//       const observer = new MutationObserver(() => {
//         const closeButton = document.querySelector(
//           '[class*="Close__CloseIcon"]'
//         ) as HTMLElement;
//         if (closeButton) {
//           closeButton.click();
//         }
//       });

//       observer.observe(document.body, {
//         childList: true,
//         subtree: true,
//       });
//     });

//     await this.sleep(5000);
//     await this.enforcedClosingPopUp();
//   }

//   private async waitForGameWindow(maxAttempts = 60) {
//     let attempts = 0;
//     while (attempts < maxAttempts) {
//       try {
//         const buffer = await this.makeScreenShot(mainLogo);
//         const result = await this.compareImages("37", buffer);

//         if (result.misMatchPercentage > 80) {
//           return logger.info(`[${this.threadId}] Загрузил окно игры`);
//         }

//         if (result.rawMisMatchPercentage !== 0) {
//           logger.error(
//             `[${this.threadId}] Расхождение с главным банером: ${result.rawMisMatchPercentage} %`
//           );
//           fs.promises
//             .writeFile(`./debug/mainWindow/${Date.now()}.png`, buffer)
//             .catch((err) => console.error(err));

//           throw new Error(
//             `[${this.threadId}] Failed to start cause of wrong coordinates`
//           );
//         }
//         attempts++;
//         await this.sleep(1000);
//       } catch (error: unknown) {
//         if (error instanceof Error && error.name === "TimeoutError") {
//           logger.warn(`[${this.threadId}]  Screenshot attempt timed out`);
//         }
//         throw error;
//       }
//     }
//     throw new Error(
//       `[${this.threadId}] Failed to find game window after ${maxAttempts} attempts`
//     );
//   }

//   private async waitForLoginWindow() {
//     const balanceElement = this.page
//       .locator("[class*=DesktopBalance__BalanceAmount]")
//       .first();
//     const registerButton = this.page.locator('//button[text()="Регистрация"]');

//     return await Promise.race([
//       balanceElement
//         .waitFor({ state: "visible" })
//         .then(() => "balance" as const),
//       registerButton
//         .waitFor({ state: "visible" })
//         .then(() => "register" as const),
//     ]);
//   }

//   private async fillLoginForm(account: Accounts) {
//     await this.enforcedClosingPopUp();
//     const form = this.page.locator('[class*="Modal__ModalContentWrapper"]');

//     while (!(await form.isVisible())) {
//       await this.page.locator('button:has-text("Вход")').click();
//       this.sleep(500);
//     }

//     const phoneInput = this.page
//       .locator('input[type="tel"], input[name*="phone"]')
//       .first();
//     await phoneInput.waitFor({ state: "visible", timeout: 15_000 });
//     await phoneInput.fill("9176552121");

//     const passwordInput = this.page.locator(
//       'input[type="password"], input[name="password"]'
//     );

//     await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
//     passwordInput.fill(account.password);
//   }

//   private async checkCaptcha() {
//     const iframe = this.page.frameLocator('iframe[title="reCAPTCHA"]');
//     const checkboxExists = await iframe
//       .locator("#recaptcha-anchor")
//       .count()
//       .catch(() => false);

//     const submit = this.page.locator('[type="submit"]');
//     if (!checkboxExists && !(await submit.isDisabled())) {
//       await submit.click();
//       return;
//     }

//     await iframe.locator("#recaptcha-anchor").click();

//     const verified = await Promise.race([
//       iframe
//         .locator(".recaptcha-checkbox-checked")
//         .waitFor()
//         .then(() => true),
//       ,
//       iframe
//         .locator('iframe[title*="challenge"]')
//         .waitFor()
//         .then(() => false),
//       ,
//     ]);

//     if (verified) {
//       await this.page.locator('[type="submit"]').click();
//     } else {
//       // ручное ожидание ввода капчи
//       const modalContent = this.page.locator(
//         '[class^="Modal__ModalContentWrapper"]'
//       );

//       await modalContent.waitFor({ state: "hidden", timeout: 999999999 });
//     }
//   }

//   private async logIntoAccount(threadId: number) {
//     let loginAttempted = false;
//     const result = await this.waitForLoginWindow();

//     if (!config.options.onlyRead && result === "register") {
//       const account = config.accounts[threadId - 1];
//       if (!account || !account.login || !account.password) {
//         throw new Error(
//           `[${this.threadId}] Проверь аккаунт под номером ${threadId}. Логин: ${
//             account.login ? account.login : "отсутствует"
//           }, пароль: ${account.password ? account.password : "отсутствует"}`
//         );
//       }

//       loginAttempted = true;
//       logger.info(
//         `[${this.threadId}] Пытаюсь войти в аккаунт ${account.login}:${account.password}`
//       );

//       await this.fillLoginForm(account);
//       await this.checkCaptcha();
//     }

//     logger.warn(
//       config.options.onlyRead
//         ? `[${this.threadId}] Парсер работает в режиме чтения выпдающих цифр`
//         : `[${this.threadId}] Закончил со входом`
//     );

//     await this.sleep(10000);
//     return loginAttempted;
//   }

//   async initialize(threadId: number) {
//     await this.prepare();

//     if (threadId > 0) {
//       await this.logIntoAccount(threadId);
//       await this.saveContext(threadId);
//     }
//     await this.observePopUp();
//     await this.waitForGameWindow();
//   }

//   private getImageTypeComparing(type: FileType) {
//     switch (type) {
//       case "приемСтавок":
//         return imageComparator.textImageFiles.get("ПриемСтавок")!;
//       case "ИдетИгра":
//         return imageComparator.textImageFiles.get("ИдетИгра")!;
//       case "ВыиграшПо":
//         return imageComparator.textImageFiles.get("ВыиграшПо")!;
//       case "37":
//         return imageComparator.textImageFiles.get("37")!;
//       default:
//         throw new Error(
//           `[${this.threadId}] There is no variant to choose: ${type}`
//         );
//     }
//   }

//   async determineCurrentStage() {
//     const screenshotBuffer = await this.makeScreenShot(textOnBord);
//     const result1 = await this.compareImages("приемСтавок", screenshotBuffer);
//     if (result1.misMatchPercentage <= 10) return "приемСтавок";

//     const result2 = await this.compareImages("ИдетИгра", screenshotBuffer);
//     if (result2.misMatchPercentage <= 10) return "ИдетИгра";

//     const result3 = await this.compareImages("ВыиграшПо", screenshotBuffer);
//     if (result3.misMatchPercentage <= 10) return "ВыиграшПо";

//     return "common";
//   }

//   async waitForImageMatch(type: FileType, timeoutMs: number = 60000) {
//     const startTime = Date.now();
//     while (Date.now() - startTime < timeoutMs) {
//       const result = await this.compareImages(type);
//       if (result.misMatchPercentage >= 10) {
//         logger.debug(
//           `[${this.threadId}] Закончил ожидать "${type}" с: ${result.misMatchPercentage}`
//         );
//         return;
//       }
//       await this.sleep(500);
//     }

//     throw new Error(
//       `[${this.threadId}] Timeout reached for "${type}". Exiting wait loop`
//     );
//   }

//   private async compareImages(type: FileType, screenshotBuffer?: Buffer) {
//     if (!type) {
//       throw new Error(`[${this.threadId}] No type in compareImages method`);
//     }
//     const buffer = screenshotBuffer || (await this.makeScreenShot(textOnBord));
//     const referenceImage = this.getImageTypeComparing(type);

//     return new Promise<resemble.ComparisonResult>((resolve) => {
//       resemble(buffer)
//         .compareTo(referenceImage)
//         .ignoreNothing()
//         .onComplete(resolve);
//     });
//   }

//   async makeScreenShot(
//     options: {
//       x: number;
//       y: number;
//       width: number;
//       height: number;
//     } = numbers
//   ) {
//     return await this.page.screenshot({
//       clip: options,
//       timeout: 5000,
//       animations: "disabled",
//     });
//   }

//   async enforcedClosingPopUp() {
//     await this.page.evaluate(() => {
//       const closeButton = document.querySelector(
//         '[class*="Close__CloseIcon"]'
//       ) as HTMLElement;
//       if (closeButton) {
//         closeButton.click();
//       }
//     });
//     const modalContent = this.page.locator(
//       '[class^="Modal__ModalContentWrapper"]'
//     );

//     await modalContent.waitFor({ state: "hidden", timeout: 5000 });
//   }

//   async sleep(ms: number) {
//     return await new Promise((resolve) => {
//       setTimeout(resolve, ms);
//     });
//   }
// }
