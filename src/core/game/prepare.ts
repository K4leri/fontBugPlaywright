import BrowserAutomation from "../browser/base";
import { PopupService } from "./popupService";

export async function prepare(base: BrowserAutomation) {
  await base.navigate("https://betboom.ru/game/tennis37_v2");

  const popupService = new PopupService(base.page);

  await popupService.observePopUp();
  await base.page.evaluate(() => {
    Object.defineProperty(document, "fonts", {
      value: {
        ready: Promise.resolve(),
      },
    });
  });
}
