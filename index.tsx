/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { PluginDef } from "@utils/types";
import { React } from "@webpack/common";

import { Player } from "./PlayerComponent";
import settings from "./settings";
import { YTMDStore } from "./YTMDStore";
function toggleHoverControls(enabled: boolean) {
    const root = document.documentElement;
    root.style.setProperty("--ytmd-hover-opacity", enabled ? "0" : "1");
    root.style.setProperty("--ytmd-hover-transform", enabled ? "translateY(100%)" : "none");
    console.log(`[YTMD] Hover controls ${enabled ? "enabled" : "disabled"}`);
}

export default definePlugin<PluginDef>({
    name: "YTMDCONTROLLER",
    description: "Adds a YTMD player above the account panel",
    authors: [
        {
            name: "Dailytinker",
            id: 675227360965951498n,
        },
    ],
    settings,
    patches: [
        {
            // Target the account panel specifically
            find: ".accountProfile-",
            replacement: {
                match: /(?<=createElement\(.+?.createElement\()[\w$]+,{username:/,
                replace: m => `${m}$self.injectPlayer(),`
            }
        }
    ],
    injectPlayer(original: any) {
        return React.createElement(ErrorBoundary, {
            fallback: () => null
        }, [
            React.createElement("div", {
                className: "vc-ytmd-wrapper",
                key: "ytmd-player"
            }, React.createElement(Player)),
            original
        ]);
    },

    start() {
        const settings = Settings.plugins.YTMDCONTROLLER;
        if (settings?.hoverControls) {
            toggleHoverControls(true);
            console.log("[YTMD] Hover controls enabled");
        }
        YTMDStore.initialize();
    },

    stop() {
        toggleHoverControls(false);
        YTMDStore.disconnect();
        console.log("[YTMD] Plugin stopped");
    }
});
