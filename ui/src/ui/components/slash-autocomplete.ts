import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export type SlashCommandItem = {
  name: string;
  description: string;
};

/**
 * Floating autocomplete popup for slash commands.
 * Renders above the chat textarea when the user types `/`.
 *
 * @fires slash-select - When a command is selected. Detail: { command: string }
 * @fires slash-dismiss - When the popup is dismissed (Escape).
 */
@customElement("slash-autocomplete")
export class SlashAutocomplete extends LitElement {
  @property({ type: Array }) commands: SlashCommandItem[] = [];
  @property({ type: String }) filter = "";
  @property({ type: Boolean }) visible = false;

  @state() private selectedIndex = 0;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      z-index: 100;
      pointer-events: none;
    }

    .popup {
      pointer-events: auto;
      max-height: 220px;
      overflow-y: auto;
      background: var(--bg-elevated, #1e1e2e);
      border: 1px solid var(--border, #333);
      border-radius: 8px;
      margin-bottom: 4px;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
      scrollbar-width: thin;
    }

    .item {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background var(--duration-fast, 80ms) ease-out;
    }

    .item:hover,
    .item[aria-selected="true"] {
      background: var(--bg-hover, #2a2a3a);
    }

    .item-name {
      font-family: var(--mono, monospace);
      font-size: 0.9em;
      font-weight: 600;
      color: var(--accent, #7aa2f7);
      white-space: nowrap;
    }

    .item-desc {
      font-size: 0.85em;
      color: var(--muted, #888);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      padding: 8px 12px;
      color: var(--muted, #888);
      font-size: 0.85em;
    }
  `;

  get filtered(): SlashCommandItem[] {
    const query = this.filter.toLowerCase();
    if (!query) {
      return this.commands;
    }
    return this.commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) || cmd.description.toLowerCase().includes(query),
    );
  }

  private _boundSlashKeydown = (e: Event) =>
    this._onSlashKeydown(e as CustomEvent<{ originalEvent: KeyboardEvent }>);

  connectedCallback() {
    super.connectedCallback();
    this.parentElement?.addEventListener("slash-keydown", this._boundSlashKeydown);
  }

  disconnectedCallback() {
    this.parentElement?.removeEventListener("slash-keydown", this._boundSlashKeydown);
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("filter") || changed.has("commands")) {
      this.selectedIndex = 0;
    }
    if (changed.has("visible") && this.visible) {
      this.selectedIndex = 0;
    }
  }

  private _onSlashKeydown(e: CustomEvent<{ originalEvent: KeyboardEvent }>) {
    const ke = e.detail.originalEvent;
    if (!this.visible) {
      return;
    }
    const items = this.filtered;
    if (!items.length) {
      return;
    }

    switch (ke.key) {
      case "ArrowUp":
        ke.preventDefault();
        this.selectedIndex = this.selectedIndex <= 0 ? items.length - 1 : this.selectedIndex - 1;
        this.scrollSelectedIntoView();
        break;

      case "ArrowDown":
        ke.preventDefault();
        this.selectedIndex = this.selectedIndex >= items.length - 1 ? 0 : this.selectedIndex + 1;
        this.scrollSelectedIntoView();
        break;

      case "Tab":
        ke.preventDefault();
        if (items[this.selectedIndex]) {
          this.selectCommand(items[this.selectedIndex].name);
        }
        break;

      case "Enter":
        // Only autocomplete on Enter if the filter is a partial match.
        // If it exactly matches a command, let Enter pass through to send.
        if (items[this.selectedIndex] && items[this.selectedIndex].name !== this.filter) {
          ke.preventDefault();
          this.selectCommand(items[this.selectedIndex].name);
        }
        break;

      case "Escape":
        ke.preventDefault();
        this.dispatchEvent(new CustomEvent("slash-dismiss"));
        break;
    }
  }

  private scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector('[aria-selected="true"]');
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  private selectCommand(name: string) {
    this.dispatchEvent(new CustomEvent("slash-select", { detail: { command: name } }));
  }

  render() {
    if (!this.visible) {
      return nothing;
    }
    const items = this.filtered;
    if (!items.length) {
      return html`
        <div class="popup"><div class="empty">No matching commands</div></div>
      `;
    }

    return html`
      <div class="popup" role="listbox">
        ${items.map(
          (cmd, i) => html`
            <div
              class="item"
              role="option"
              aria-selected=${i === this.selectedIndex}
              @click=${() => this.selectCommand(cmd.name)}
              @pointerenter=${() => {
                this.selectedIndex = i;
              }}
            >
              <span class="item-name">/${cmd.name}</span>
              <span class="item-desc">${cmd.description}</span>
            </div>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "slash-autocomplete": SlashAutocomplete;
  }
}
