// Tile Media Card
// Custom Lovelace card: big cover art, playback controls (prev/play-pause/stop/next),
// a volume slider matching the native tile card's style, and an inline "browse" button
// that opens an in-app overlay (via the media_player/browse_media WS call) instead of
// handing off to the Music Assistant panel or navigating away from the dashboard.

import { LitElement, html, css } from "https://esm.sh/lit@3";

class TileMediaCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
      _browsing: { state: true },
      _browseStack: { state: true },
      _browseItems: { state: true },
      _browseTitle: { state: true },
      _browseLoading: { state: true },
      _browseError: { state: true },
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You must define an entity");
    }
    this._config = config;
    this._browsing = false;
    this._browseStack = [];
    this._browseItems = [];
    this._browseTitle = "";
    this._browseLoading = false;
    this._browseError = null;
  }

  static getStubConfig() {
    return {
      entity: "",
      hide_art_when_idle: false,
      hide_titles: [],
      hide_media_classes: [],
      grid_options: { columns: 12, rows: "auto" },
    };
  }

  static getConfigElement() {
    return document.createElement("tile-media-card-editor");
  }

  getCardSize() {
    return 4;
  }

  get _isActive() {
    const stateObj = this._stateObj;
    return !!stateObj && ["playing", "paused", "buffering"].includes(stateObj.state);
  }

  get _stateObj() {
    return this.hass && this._config ? this.hass.states[this._config.entity] : undefined;
  }

  _callService = (service, data = {}) => {
    this.hass.callService("media_player", service, {
      entity_id: this._config.entity,
      ...data,
    });
  };

  _prev = () => this._callService("media_previous_track");
  _next = () => this._callService("media_next_track");
  _stop = () => this._callService("media_stop");
  _togglePlay = () => this._callService("media_play_pause");

  _volumeChanged = (ev) => {
    const value = ev.detail.value;
    if (typeof value !== "number") return;
    this._callService("volume_set", { volume_level: value / 100 });
  };

  _toggleMute = () => {
    const stateObj = this._stateObj;
    this._callService("volume_mute", {
      is_volume_muted: !stateObj?.attributes.is_volume_muted,
    });
  };

  _openBrowse = async () => {
    this._browsing = true;
    this._browseStack = [];
    this._browseError = null;
    await this._loadBrowse();
  };

  _closeBrowse = () => {
    this._browsing = false;
  };

  _browseBack = () => {
    const stack = this._browseStack.slice(0, -1);
    this._browseStack = stack;
    this._loadBrowse(stack[stack.length - 1]);
  };

  async _loadBrowse(item) {
    this._browseLoading = true;
    this._browseError = null;
    try {
      const result = await this.hass.callWS({
        type: "media_player/browse_media",
        entity_id: this._config.entity,
        media_content_id: item?.media_content_id,
        media_content_type: item?.media_content_type,
      });
      this._browseTitle = result.title || "Browse";
      this._browseItems = this._filterItems(result.children || []);
    } catch (err) {
      this._browseError = err.message || "Could not load media";
      this._browseItems = [];
    } finally {
      this._browseLoading = false;
    }
  }

  _filterItems(items) {
    const hideTitles = (this._config.hide_titles || []).map((t) => t.toLowerCase());
    const hideClasses = this._config.hide_media_classes || [];
    if (!hideTitles.length && !hideClasses.length) return items;
    return items.filter((item) => {
      const title = (item.title || "").toLowerCase();
      if (hideTitles.some((h) => title.includes(h))) return false;
      if (hideClasses.includes(item.media_class)) return false;
      return true;
    });
  }

  // Containers (artist/album/playlist) are usually both browsable and
  // directly playable as a whole - tapping the tile navigates in, while a
  // separate play button (see _playItem) plays the whole thing. A plain
  // track is only playable, never expandable.
  _selectItem = async (item) => {
    if (item.can_expand) {
      this._browseStack = [...this._browseStack, item];
      await this._loadBrowse(item);
    } else if (item.can_play) {
      this._playItem(item);
    }
  };

  _playItem = (item, ev) => {
    ev?.stopPropagation();
    this.hass.callService("media_player", "play_media", {
      entity_id: this._config.entity,
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type,
    });
    this._closeBrowse();
  };

  render() {
    if (!this.hass || !this._config) return html``;
    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="not-found">Entity not found: ${this._config.entity}</div>
        </ha-card>
      `;
    }

    // Prefer the HA-proxied, same-origin picture URL over the raw one Music
    // Assistant provides (entity_picture is often a plain-http link straight
    // to the MA server's own IP, which browsers/webviews block as mixed
    // content on an https dashboard).
    const picture = stateObj.attributes.entity_picture_local || stateObj.attributes.entity_picture;
    const title = stateObj.attributes.media_title || "Nothing playing";
    const artist = stateObj.attributes.media_artist || "";
    const isPlaying = stateObj.state === "playing";
    const muted = stateObj.attributes.is_volume_muted;
    const volume = Math.round((stateObj.attributes.volume_level ?? 0) * 100);

    const hideArt = this._config.hide_art_when_idle && !this._isActive;
    const artStyle = picture ? `background-image:url(${picture})` : "";

    return html`
      <ha-card>
        ${hideArt
          ? ""
          : html`
              <div class="art" style=${artStyle}>
                ${!picture ? html`<ha-icon class="art-fallback" icon="mdi:speaker"></ha-icon>` : ""}
                <div class="scrim">
                  <div class="title">${title}</div>
                  ${artist ? html`<div class="artist">${artist}</div>` : ""}
                </div>
              </div>
            `}

        <div class="controls-row">
          <ha-control-button-group>
            <ha-control-button @click=${this._prev} title="Previous">
              <ha-icon icon="mdi:skip-previous"></ha-icon>
            </ha-control-button>
            <ha-control-button @click=${this._togglePlay} title="Play/Pause">
              <ha-icon icon=${isPlaying ? "mdi:pause" : "mdi:play"}></ha-icon>
            </ha-control-button>
            <ha-control-button @click=${this._stop} title="Stop">
              <ha-icon icon="mdi:stop"></ha-icon>
            </ha-control-button>
            <ha-control-button @click=${this._next} title="Next">
              <ha-icon icon="mdi:skip-next"></ha-icon>
            </ha-control-button>
            <ha-control-button @click=${this._openBrowse} title="Browse">
              <ha-icon icon="mdi:folder-music"></ha-icon>
            </ha-control-button>
          </ha-control-button-group>
        </div>

        <div class="volume-row">
          <ha-icon class="volume-icon" icon=${muted ? "mdi:volume-off" : "mdi:volume-high"} @click=${this._toggleMute}></ha-icon>
          <ha-control-slider
            .value=${volume}
            min="0"
            max="100"
            @value-changed=${this._volumeChanged}
          ></ha-control-slider>
        </div>

        ${this._browsing ? this._renderBrowseDialog() : ""}
      </ha-card>
    `;
  }

  _renderBrowseDialog() {
    return html`
      <ha-dialog open hideActions @closed=${this._closeBrowse} .heading=${this._browseTitle}>
        <div slot="heading" class="browse-header">
          ${this._browseStack.length
            ? html`<ha-icon-button @click=${this._browseBack}>
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </ha-icon-button>`
            : html`<span class="spacer"></span>`}
          <span class="browse-title">${this._browseTitle}</span>
          <ha-icon-button @click=${this._closeBrowse}>
            <ha-icon icon="mdi:close"></ha-icon>
          </ha-icon-button>
        </div>

        ${this._browseLoading
          ? html`<div class="browse-loading">Loading…</div>`
          : this._browseError
          ? html`<div class="browse-loading">${this._browseError}</div>`
          : html`
              <div class="browse-grid">
                ${this._browseItems.map(
                  (item) => html`
                    <div class="browse-item" @click=${() => this._selectItem(item)}>
                      <div
                        class="thumb"
                        style=${item.thumbnail ? `background-image:url(${item.thumbnail})` : ""}
                      >
                        ${!item.thumbnail
                          ? html`<ha-icon
                              icon=${item.can_expand ? "mdi:folder-music" : "mdi:music-note"}
                            ></ha-icon>`
                          : ""}
                        ${item.can_play
                          ? html`<ha-icon-button
                              class="play-overlay"
                              title="Play"
                              @click=${(ev) => this._playItem(item, ev)}
                            >
                              <ha-icon icon="mdi:play-circle"></ha-icon>
                            </ha-icon-button>`
                          : ""}
                      </div>
                      <div class="item-title">${item.title}</div>
                    </div>
                  `
                )}
                ${!this._browseItems.length
                  ? html`<div class="browse-empty">Nothing here</div>`
                  : ""}
              </div>
            `}
      </ha-dialog>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        overflow: hidden;
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .not-found {
        padding: 16px;
        color: var(--error-color, red);
      }
      .art {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        flex: 1 1 auto;
        min-height: 0;
        background-size: cover;
        background-position: center;
        background-color: var(--secondary-background-color);
        display: flex;
        align-items: flex-end;
      }
      .controls-row,
      .volume-row {
        flex: 0 0 auto;
      }
      .art-fallback {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        --mdc-icon-size: 48px;
        color: var(--secondary-text-color);
      }
      .scrim {
        width: 100%;
        padding: 24px 16px 12px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));
        box-sizing: border-box;
      }
      .title {
        color: white;
        font-size: 1.1rem;
        font-weight: 500;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .artist {
        color: rgba(255, 255, 255, 0.85);
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .controls-row {
        display: flex;
        justify-content: center;
        padding: 12px 16px 4px;
      }
      ha-control-button-group {
        width: 100%;
        max-width: 400px;
      }
      .volume-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px 16px;
      }
      .volume-icon {
        color: var(--secondary-text-color);
        cursor: pointer;
        flex-shrink: 0;
      }
      ha-control-slider {
        flex: 1;
        --control-slider-color: var(--accent-color);
      }
      ha-dialog {
        --mdc-dialog-min-width: min(90vw, 480px);
        --mdc-dialog-max-width: min(90vw, 480px);
        --mdc-dialog-max-height: 80vh;
      }
      .browse-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .spacer {
        width: 48px;
      }
      .browse-title {
        flex: 1;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .browse-loading,
      .browse-empty {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color);
      }
      .browse-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 16px;
        padding: 8px 4px 16px;
        max-height: 60vh;
        overflow-y: auto;
      }
      .browse-item {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 8px;
        background-size: cover;
        background-position: center;
        background-color: var(--secondary-background-color);
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 32px;
        color: var(--secondary-text-color);
      }
      .play-overlay {
        position: absolute;
        bottom: -4px;
        right: -4px;
        --mdc-icon-button-size: 32px;
        --mdc-icon-size: 28px;
        color: var(--primary-color);
        background: var(--card-background-color);
        border-radius: 50%;
      }
      .item-title {
        margin-top: 6px;
        font-size: 0.8rem;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }
    `;
  }
}

customElements.define("tile-media-card", TileMediaCard);

const EDITOR_LABELS = {
  entity: "Entity",
  hide_art_when_idle: "Hide album art when nothing is playing",
  hide_titles: "Hide items in the media browser",
};

class TileMediaCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },
      _rootItems: { state: true },
      _rootError: { state: true },
    };
  }

  setConfig(config) {
    this._config = {
      hide_art_when_idle: false,
      hide_titles: [],
      ...config,
    };
  }

  updated(changedProps) {
    if ((changedProps.has("_config") || changedProps.has("hass")) && this.hass) {
      this._maybeLoadRootItems();
    }
  }

  // Fetch the top-level browse items for the configured entity so the editor
  // can offer real folder/category names (e.g. "Images") to hide, instead of
  // asking the user to guess and type them by hand.
  async _maybeLoadRootItems() {
    const entity = this._config?.entity;
    if (!entity || entity === this._rootItemsEntity) return;
    this._rootItemsEntity = entity;
    this._rootError = null;
    try {
      const result = await this.hass.callWS({
        type: "media_player/browse_media",
        entity_id: entity,
      });
      this._rootItems = [...new Set((result.children || []).map((item) => item.title))];
    } catch (err) {
      this._rootItems = [];
      this._rootError = err.message || "Could not load media browser items";
    }
  }

  get _schema() {
    return [
      { name: "entity", selector: { entity: { domain: "media_player" } } },
      { name: "hide_art_when_idle", selector: { boolean: {} } },
      {
        name: "hide_titles",
        selector: {
          select: {
            multiple: true,
            custom_value: true,
            options: this._rootItems || [],
          },
        },
      },
    ];
  }

  _computeLabel = (schema) => EDITOR_LABELS[schema.name] || schema.name;

  _computeHelper = (schema) =>
    schema.name === "hide_titles"
      ? this._rootError
        ? `${this._rootError} — you can still type a name manually.`
        : "Pick from the entity's top-level browse items, or type a name (matches anywhere in the title, case-insensitive)."
      : undefined;

  _valueChanged = (ev) => {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: ev.detail.value },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("tile-media-card-editor", TileMediaCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tile-media-card",
  name: "Tile Media Card",
  description: "Cover art, playback controls, volume slider, and inline media browsing — styled to match HA's native tile card.",
});
