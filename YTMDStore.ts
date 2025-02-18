/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";
import { io, Socket } from "socket.io-client";

import settings from "./settings";

// Interfaces
interface VideoThumbnail {
    url: string;
    width: number;
    height: number;
}

interface YTMDPlayerState {
    player: {
        trackState: number;
        videoProgress: number;
        volume?: number;
        repeatMode?: "NONE" | "ONE" | "ALL";
    };
    video: {
        title: string;
        author: string;
        thumbnails: VideoThumbnail[];
        durationSeconds: number;
    };
}

export interface Track {
    id: string;
    name: string;
    duration: number;
    album: {
        name: string;
        image: string;
    };
    artists: {
        name: string;
    }[];
}

const API_BASE = "http://localhost:9863";

class YTMDStore {
    private fluxDispatcher = FluxDispatcher;
    private listeners: Set<() => void> = new Set();
    private socket: Socket | null = null;
    private previousTitle: string | null = null;
    private isInitialized = false;

    public track: Track | null = null;
    public isPlaying = false;
    public repeat: "NONE" | "ONE" | "ALL" = "NONE";
    public volume = 0;
    public position = 0;
    public duration = 0;
    public isSettingPosition = false;

    initialize() {
        if (this.isInitialized) return;
        this.connectSocket();
        console.log("[YTMD] Store initialized");
    }

    private connectSocket() {
        if (!settings.store.apiKey) {
            console.error("[YTMD] Cannot connect: No API key set");
            return;
        }

        try {
            this.socket = io(`${API_BASE}/api/v1/realtime`, {
                transports: ["websocket"],
                auth: {
                    token: settings.store.apiKey
                }
            });

            this.setupEventHandlers();
            console.log("[YTMD] Socket connection initialized");
        } catch (err) {
            console.error("[YTMD] Socket connection error:", err);
        }
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on("connect", () => {
            console.log("[YTMD] WebSocket connected successfully");
            this.isInitialized = true;
        });

        this.socket.on("state-update", (state: YTMDPlayerState) => {
            try {
                this.handleStateUpdate(state);
            } catch (err) {
                console.error("[YTMD] Error handling state update:", err);
            }
        });

        this.socket.on("disconnect", reason => {
            console.log("[YTMD] WebSocket disconnected:", reason);
            this.isInitialized = false;
        });

        this.socket.on("connect_error", error => {
            console.error("[YTMD] Connection error:", error);
            this.isInitialized = false;
        });
    }

    private reactComponents = new Map<React.Component, () => void>();

    addReactChangeListener(component: React.Component) {
        const listener = () => component.forceUpdate();
        this.reactComponents.set(component, listener);
        this.listeners.add(listener);
    }

    removeReactChangeListener(component: React.Component) {
        const listener = this.reactComponents.get(component);
        if (listener) {
            this.listeners.delete(listener);
            this.reactComponents.delete(component);
        }
    }

    // Update emitChange to include React components
    private emitChange() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    private handleStateUpdate(state: YTMDPlayerState) {
        if (!state?.player || !state?.video) {
            console.error("[YTMD] Invalid state received:", state);
            return;
        }

        try {
            // Update track info based on player state
            if (state.player.trackState !== 0) {
                // Log song change only when title changes
                if (this.previousTitle !== state.video.title) {
                    console.log("[YTMD] Now playing:", {
                        title: state.video.title,
                        artist: state.video.author,
                        duration: state.video.durationSeconds
                    });
                    this.previousTitle = state.video.title;
                }

                // Update track information
                this.track = {
                    id: String(Date.now()),
                    name: state.video.title || "Unknown Title",
                    duration: state.video.durationSeconds || 0,
                    album: {
                        name: "YouTube Music",
                        image: state.video.thumbnails?.[0]?.url || ""
                    },
                    artists: [{
                        name: state.video.author || "Unknown Artist"
                    }]
                };

                // Update player state
                this.isPlaying = true;
                this.position = state.player.videoProgress || 0;
                this.duration = state.video.durationSeconds || 0;
                if (state.player.volume !== undefined) this.volume = state.player.volume;
                if (state.player.repeatMode) this.repeat = state.player.repeatMode;

                // Emit change only if we have valid data
                this.emitChange();
            } else {
                this.isPlaying = false;
                this.emitChange();
            }
        } catch (error) {
            console.error("[YTMD] Error handling state update:", error);
            console.error("[YTMD] State data:", state);
        }
    }

    // Player control methods
    setPlaying(playing: boolean) {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: playing ? "play" : "pause" });
    }

    seek(position: number) {
        if (!this.socket) return;
        this.isSettingPosition = true;
        this.socket.emit("player-command", { command: "seek", value: position });
        setTimeout(() => {
            this.isSettingPosition = false;
        }, 1000);
    }

    setVolume(volume: number) {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: "volume", value: volume });
    }

    next() {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: "next" });
    }

    prev() {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: "previous" });
    }

    setRepeat(mode: "NONE" | "ONE" | "ALL") {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: "repeat", value: mode });
    }

    setShuffle(enabled: boolean) {
        if (!this.socket) return;
        this.socket.emit("player-command", { command: "shuffle", value: enabled });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isInitialized = false;
        console.log("[YTMD] Store disconnected");
    }
}

const store = new YTMDStore();

export function initYTMDStore() {
    store.initialize();
    return store;
}

export { store as YTMDStore };
