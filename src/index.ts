import { threadManager } from "./core/game/setupEnvironment";

async function main() {
  await threadManager.setupEnvironment();
}

main().catch((error) => {
  console.error("Error running app:", error);
});
