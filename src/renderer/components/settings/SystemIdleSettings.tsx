/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading, Margins } from "@vencord/types/components";
import { TextInput } from "@vencord/types/webpack/common";

import { SettingsComponent } from "./Settings";
import { VesktopSettingsSwitch } from "./VesktopSettingsSwitch";

const DEFAULT_TIMEOUT_MINUTES = 10;

export const SystemIdleSettings: SettingsComponent = ({ settings }) => {
    const systemIdle = settings.systemIdle ?? { enabled: true, timeoutMinutes: DEFAULT_TIMEOUT_MINUTES };

    return (
        <div>
            <VesktopSettingsSwitch
                title="Use System Idle Time"
                description="Set your status based OS-level inactivity"
                value={systemIdle.enabled}
                onChange={v => (settings.systemIdle = { ...systemIdle, enabled: v })}
            />

            <Heading tag="h5" className={Margins.top8}>
                Idle timeout (minutes, 0 = never)
            </Heading>
            <TextInput
                type="number"
                min={0}
                disabled={!systemIdle.enabled}
                value={String(systemIdle.timeoutMinutes)}
                onChange={v => {
                    const timeoutMinutes = Math.max(0, Number(v) || 0);
                    settings.systemIdle = { ...systemIdle, timeoutMinutes };
                }}
            />
        </div>
    );
};
