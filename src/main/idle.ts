/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { powerMonitor } from "electron";

import { IpcEvents } from "../shared/IpcEvents";
import { mainWin } from "./mainWindow";
import { handle } from "./utils/ipcWrappers";

handle(IpcEvents.POWER_MONITOR_GET_SYSTEM_IDLE_TIME, () => Math.round(powerMonitor.getSystemIdleTime() * 1000));

function sendToMainWin(ipcEvent: IpcEvents) {
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(ipcEvent);
}

powerMonitor.on("resume", () => sendToMainWin(IpcEvents.POWER_MONITOR_RESUME));
powerMonitor.on("suspend", () => sendToMainWin(IpcEvents.POWER_MONITOR_SUSPEND));
powerMonitor.on("lock-screen", () => sendToMainWin(IpcEvents.POWER_MONITOR_LOCK_SCREEN));
powerMonitor.on("unlock-screen", () => sendToMainWin(IpcEvents.POWER_MONITOR_UNLOCK_SCREEN));
