/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { OptionType } from "@utils/types";

import hoverOnlyStyle from "./hoverOnly.css?managed";

function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}
const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "YouTube Music Desktop API Key",
        default: "",
        placeholder: "Enter your YTMD API key"
    },
    hoverControls: {
        description: "Show controls on hover",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: v => toggleHoverControls(v)
    },
    useYTMDUris: {
        type: OptionType.BOOLEAN,
        description: "Open ytmd URIs instead of ytmd URLs. Will only work if you have ytmd installed and might not work on all platforms",
        default: false
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Restart currently playing track when pressing the previous button if playtime is >3s",
        default: true
    }
});


export default settings;
