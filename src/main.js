import { meet } from '@googleworkspace/meet-addons/meet.addons';
import { CLOUD_PROJECT_NUMBER, MAIN_STAGE_URL } from "env.js";

export async function setUpAddon() {
    const session = await meet.addon.createAddonSession({
        cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    const sidePanelClient = await session.createSidePanelClient();
    document
        .getElementById('start-activity')
        .addEventListener('click', async () => {
            await sidePanelClient.startActivity({
                mainStageUrl: MAIN_STAGE_URL
            });
        });
}

export async function initializeMainStage() {
    const session = await meet.addon.createAddonSession({
        cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    await session.createMainStageClient();
}