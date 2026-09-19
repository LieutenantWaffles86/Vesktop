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

/** Whether the OS reports no input for longer than the configured timeout. */
let systemIdle = false;
/** The idle state Discord currently holds, tracked by observing every IDLE dispatch. */
let discordIdle = false;

function getSystemIdleSettings() {
    return Settings.store.systemIdle ?? { enabled: false, timeoutMinutes: 10 };
}

/**
 * Discord derives its idle state from window focus alone, so it drifts from the real
 * OS idle state in both directions: it idles as soon as Vesktop is unfocused, and it
 * stays online while the window is focused but the user is away. Re-assert the OS
 * state whenever the two disagree.
 */
function syncIdleState() {
    if (discordIdle === systemIdle) return;

    discordIdle = systemIdle;
    FluxDispatcher.dispatch({ type: "IDLE", idle: systemIdle });
}

function setSystemIdle(idle: boolean) {
    if (!getSystemIdleSettings().enabled) return;

    systemIdle = idle;
    syncIdleState();
}

async function checkSystemIdle() {
    const { enabled, timeoutMinutes } = getSystemIdleSettings();
    if (!enabled) return;

    try {
        const idleMs = await VesktopNative.powerMonitor.getSystemIdleTime();
        const timeoutMs = timeoutMinutes * 60_000;

        setSystemIdle(timeoutMs > 0 && idleMs >= timeoutMs);
    } catch (e) {
        VesktopLogger.error("Failed to check system idle time", e);
    }
}

onceReady.then(() => {
    setInterval(checkSystemIdle, CHECK_INTERVAL_MS);
    checkSystemIdle();

    FluxDispatcher.subscribe("IDLE", (e: { idle: boolean }) => {
        discordIdle = Boolean(e.idle);
        if (!getSystemIdleSettings().enabled) return;

        // Deferred so we never dispatch from inside Discord's own dispatch cycle.
        // syncIdleState only dispatches on divergence, so our own events settle here.
        setTimeout(syncIdleState, 0);
    });

    // React instantly to OS-level power events instead of waiting for the next poll.
    VesktopNative.powerMonitor.onResume(checkSystemIdle);
    VesktopNative.powerMonitor.onUnlockScreen(checkSystemIdle);
    VesktopNative.powerMonitor.onSuspend(() => setSystemIdle(true));
    VesktopNative.powerMonitor.onLockScreen(() => setSystemIdle(true));
});
