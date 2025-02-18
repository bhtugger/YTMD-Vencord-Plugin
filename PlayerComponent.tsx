/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./YTMDStyles.css";

import { Settings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { ImageIcon } from "@components/Icons";
import { debounce } from "@shared/debounce";
import { openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import { ContextMenuApi, FluxDispatcher, Forms, Menu, React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { Track, YTMDStore } from "./YTMDStore";

const cl = classNameFactory("vc-YTMD-");

function msToHuman(ms: number) {
    const minutes = ms / 1000 / 60;
    const m = Math.floor(minutes);
    const s = Math.floor((minutes - m) * 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function Svg(path: string, label: string) {
    return () => (
        <svg
            className={cl("button-icon", label)}
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <path d={path} />
        </svg>
    );
}

const PlayButton = Svg("M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z", "play");
const PauseButton = Svg("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z", "pause");
const SkipPrev = Svg("M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z", "previous");
const SkipNext = Svg("M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z", "next");
const Repeat = Svg("M7 7h10v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.2.2-.51 0-.71l-2.79-2.79c-.31-.31-.85-.09-.85.36V5H6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V7zm10 10H7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79c.31.31.85.09.85-.36V19h11c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v3z", "repeat");

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={cl("button")}
            {...props}
        >
            {props.children}
        </button>
    );
}

function Controls() {
    const [isPlaying, repeat] = useStateFromStores(
        [YTMDStore],
        () => [YTMDStore.isPlaying, YTMDStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "NONE": return ["ONE", "repeat-off"] as const;
            case "ONE": return ["ALL", "repeat-one"] as const;
            case "ALL": return ["NONE", "repeat-all"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    return (
        <Flex className={cl("button-row")} style={{ gap: 0 }}>
            <Button onClick={() => {
                Settings.plugins.YTMDControls.previousButtonRestartsTrack && YTMDStore.position > 3000
                    ? YTMDStore.next()
                    : YTMDStore.prev();
            }}>
                <SkipPrev />
            </Button>
            <Button onClick={() => YTMDStore.setPlaying(!isPlaying)}>
                {isPlaying ? <PauseButton /> : <PlayButton />}
            </Button>
            <Button onClick={() => YTMDStore.next()}>
                <SkipNext />
            </Button>
            <Button
                className={classes(cl("button"), cl("repeat"), cl(repeatClassName))}
                onClick={() => YTMDStore.setRepeat(nextRepeat)}
                style={{ position: "relative" }}
            >
                {repeat === "ONE" && <span className={cl("repeat-1")}>1</span>}
                <Repeat />
            </Button>
        </Flex>
    );
}

const seek = debounce((v: number) => {
    YTMDStore.seek(v);
});

function SeekBar() {
    const { duration } = YTMDStore.track!;

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [YTMDStore],
        () => [YTMDStore.position, YTMDStore.isSettingPosition, YTMDStore.isPlaying]
    );

    const [position, setPosition] = useState(storePosition);

    useEffect(() => {
        if (isPlaying && !isSettingPosition) {
            setPosition(YTMDStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 1000);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [storePosition, isSettingPosition, isPlaying]);

    return (
        <div id={cl("progress-bar")}>
            <Forms.FormText
                variant="text-xs/medium"
                className={cl("progress-time") + " " + cl("time-left")}
                aria-label="Progress"
            >
                {msToHuman(position)}
            </Forms.FormText>
            <Menu.MenuSliderControl
                minValue={0}
                maxValue={duration}
                value={position}
                onChange={(v: number) => {
                    if (isSettingPosition) return;
                    setPosition(v);
                    seek(v);
                }}
                renderValue={msToHuman}
            />
            <Forms.FormText
                variant="text-xs/medium"
                className={cl("progress-time") + " " + cl("time-right")}
                aria-label="Total Duration"
            >
                {msToHuman(duration)}
            </Forms.FormText>
        </div>
    );
}

function AlbumContextMenu({ track }: { track: Track; }) {
    const volume = useStateFromStores([YTMDStore], () => YTMDStore.volume);

    return (
        <Menu.Menu
            navId="YTMD-album-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="YTMD Album Menu"
        >
            <Menu.MenuItem
                key="view-cover"
                id="view-cover"
                label="View Album Cover"
                action={() => openImageModal({
                    url: track.album.image,
                    width: 500,
                    height: 500,
                    animated: false
                })}
                icon={ImageIcon}
            />
            <Menu.MenuControlItem
                id="YTMD-volume"
                key="YTMD-volume"
                label="Volume"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => YTMDStore.setVolume(v))}
                    />
                )}
            />
        </Menu.Menu>
    );
}

function Info({ track }: { track: Track; }) {
    const img = track?.album?.image;
    const [coverExpanded, setCoverExpanded] = useState(false);

    const i = (
        <>
            {img && (
                <img
                    id={cl("album-image")}
                    src={img}
                    alt="Album Image"
                    onClick={() => setCoverExpanded(!coverExpanded)}
                    onContextMenu={e => {
                        ContextMenuApi.openContextMenu(e, () => <AlbumContextMenu track={track} />);
                    }}
                />
            )}
        </>
    );

    if (coverExpanded && img)
        return (
            <div id={cl("album-expanded-wrapper")}>
                {i}
            </div>
        );

    return (
        <div id={cl("info-wrapper")}>
            {i}
            <div id={cl("titles")}>
                <Forms.FormText
                    variant="text-sm/semibold"
                    id={cl("song-title")}
                    className={cl("ellipoverflow")}
                    title={track.name}
                >
                    {track.name}
                </Forms.FormText>
                <Forms.FormText variant="text-sm/normal" className={cl("ellipoverflow")}>
                    by {track.artists[0].name}
                </Forms.FormText>
                {track.album.name && (
                    <Forms.FormText variant="text-sm/normal" className={cl("ellipoverflow")}>
                        on&nbsp;
                        <span
                            id={cl("album-title")}
                            className={cl("album")}
                            style={{ fontSize: "inherit" }}
                            title={track.album.name}
                        >
                            {track.album.name}
                        </span>
                    </Forms.FormText>
                )}
            </div>
        </div>
    );
}

export function Player() {
    const track = useStateFromStores(
        [YTMDStore],
        () => YTMDStore.track,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([YTMDStore], () => YTMDStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    React.useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || shouldHide) return null;

    const exportTrackImageStyle = {
        "--vc-YTMD-track-image": `url(${track?.album?.image || ""})`,
    } as React.CSSProperties;

    return (
        <div id={cl("player")} style={exportTrackImageStyle}>
            <Info track={track} />
            <SeekBar />
            <Controls />
        </div>
    );
}
