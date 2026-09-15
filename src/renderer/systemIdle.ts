/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { onceReady } from "@vencord/types/webpack";
import { FluxDispatcher } from "@vencord/types/webpack/common";

import { VesktopLogger } from "./logger";
import { Settings } from "./settings";

const CHECK_INTERVAL_MS = 10_000;

/** Whether we last told Discord it should be idle, based on real OS idle time. */
let isSystemIdle = false;
/** Guards against reacting to our own dispatch inside the IDLE subscriber below. */
let selfDispatching = false;

function getSystemIdleSettings() {
    return Settings.store.systemIdle ?? { enabled: false, timeoutMinutes: 10 };
}

function dispatchIdle(idle: boolean) {
    if (idle === isSystemIdle) return;

    isSystemIdle = idle;
    selfDispatching = true;
    try {
        FluxDispatcher.dispatch({ type: "IDLE", idle });
    } finally {
        selfDispatching = false;
    }
}

async function checkSystemIdle() {
    const { enabled, timeoutMinutes } = getSystemIdleSettings();
    if (!enabled) return;

    try {
        const idleMs = await VesktopNative.powerMonitor.getSystemIdleTime();
        const timeoutMs = timeoutMinutes * 60_000;
        const shouldBeIdle = timeoutMs > 0 && idleMs >= timeoutMs;

        dispatchIdle(shouldBeIdle);
    } catch (e) {
        VesktopLogger.error("Failed to check system idle time", e);
    }
}

onceReady.then(() => {
    setInterval(checkSystemIdle, CHECK_INTERVAL_MS);
    checkSystemIdle();

    // Discord's own idle detection only tracks window focus/visibility, so it will
    // frequently report idle:true just because Vesktop lost focus even though the
    // user is still actively using their computer. Correct those false positives
    // using the real OS idle time we have from Electron's powerMonitor.
    FluxDispatcher.subscribe("IDLE", (e: { idle: boolean }) => {
        if (selfDispatching || !getSystemIdleSettings().enabled) return;
        if (e.idle && !isSystemIdle) dispatchIdle(false);
    });

    // React instantly to OS-level power events instead of waiting for the next poll.
    VesktopNative.powerMonitor.onResume(checkSystemIdle);
    VesktopNative.powerMonitor.onUnlockScreen(checkSystemIdle);
    VesktopNative.powerMonitor.onSuspend(() => {
        if (getSystemIdleSettings().enabled) dispatchIdle(true);
    });
    VesktopNative.powerMonitor.onLockScreen(() => {
        if (getSystemIdleSettings().enabled) dispatchIdle(true);
    });
});
