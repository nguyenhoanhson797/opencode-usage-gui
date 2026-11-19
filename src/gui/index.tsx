/**
 * The plugin's GUI part for OpenCode Desktop: the package's `./gui-experimental` entry.
 *
 * It contributes a Usage tab to a session's side panel, a limits chip at the end of the tab
 * strip (beside the new-tab button), a command and a panel-menu entry that open the tab, and a
 * page in Settings. All of it reads the plugin's own server part over RPC; the window never
 * touches the disk or the network.
 *
 * There is no `main` entry: no Electron APIs, no native menus, no file or process access.
 */
import {
  Command,
  MenuItem,
  Panel,
  type PanelTab,
  Plugin,
  SettingsPage,
  Slot,
  Store,
  Style,
} from "@opencode/plugin/gui";
import { Schema } from "effect";
import { Show } from "solid-js";
import { QUOTA_WINDOW_KEYS, USAGE_RANGES, type QuotaWindowKey, type UsageRange } from "../types.js";
import { QuotaEntry } from "./entry.js";
import { en, vi } from "./i18n.js";
import { UsagePanel } from "./panel.js";
import { UsageSettings } from "./settings.js";
import { STYLE } from "./style.js";

const Prefs = Schema.Struct({
  panel: Schema.Boolean,
  entry: Schema.Boolean,
  /** Which of the three plan windows the chip's ring shows; absent in stores from older builds. */
  entryWindow: Schema.optional(Schema.String),
  /** Kept as a string so an older stored range is normalized instead of rejecting the store. */
  range: Schema.String,
  /** The picked Go account (a credential id); empty means the active one. */
  account: Schema.String,
});

export default Plugin.define({
  i18n: { en, vi },
  stores: {
    prefs: Store.global(Prefs, {
      panel: true,
      entry: true,
      entryWindow: "rolling",
      range: "7d",
      account: "",
    }),
  },
  setup(ctx) {
    const prefs = ctx.stores.prefs;
    const panelKey = `${ctx.id}:usage`;

    /** The stored range if it is one this build knows, else the default. */
    const range = (): UsageRange =>
      (USAGE_RANGES as readonly string[]).includes(prefs.value.range)
        ? (prefs.value.range as UsageRange)
        : "7d";

    /** The stored chip window if it is one this build knows, else rolling 5h. */
    const entryWindow = (): QuotaWindowKey => {
      const stored = prefs.value.entryWindow;
      return stored && (QUOTA_WINDOW_KEYS as readonly string[]).includes(stored)
        ? (stored as QuotaWindowKey)
        : "rolling";
    };

    const currentSession = () => ctx.sessions.current();

    const openPanel = () => {
      const session = currentSession();
      if (!session) {
        ctx.toast.show({ title: ctx.t("toast.noSession") });
        return;
      }
      ctx.layout.open(panelKey, session, { tab: "select" });
    };

    ctx.add(Style, STYLE);

    ctx.add(Command, () => ({
      id: "usage",
      title: ctx.t("command.open"),
      description: ctx.t("command.open.description"),
      keywords: "usage tokens spend context limits quota",
      featured: true as const,
      slash: { name: "usage" },
      run: () => openPanel(),
    }));

    let tab: PanelTab | undefined;
    const panelTab = () => {
      const title = ctx.t("panel.title");
      if (tab?.title !== title) tab = { id: "usage", title, closable: "compact" };
      return tab;
    };

    ctx.add(Panel, {
      id: "usage",
      region: "side",
      width: "narrow",
      mobile: {
        get title() {
          return ctx.t("panel.title");
        },
        order: 40,
        kind: "menu" as const,
        icon: "status" as const,
      },
      list: () => (prefs.value.panel ? [panelTab()] : []),
      render: (props) => (
        <UsagePanel
          ctx={ctx}
          session={() => props.session}
          initialRange={range()}
          account={() => prefs.value.account || undefined}
          onAccount={(id) =>
            prefs.update((draft) => {
              draft.account = id;
            })
          }
        />
      ),
    });

    ctx.add(MenuItem, () => {
      const session = currentSession();
      if (!prefs.value.panel || !session) return undefined;
      const state = ctx.layout.state(panelKey, session);
      return {
        menu: "session.panel" as const,
        id: "usage",
        title: ctx.t("panel.title"),
        icon: "status" as const,
        ...(state !== undefined && state !== "closed" ? { opened: true } : {}),
        run: () => {
          const shown = currentSession();
          if (shown) ctx.layout.open(panelKey, shown, { tab: "select" });
        },
      };
    });

    ctx.add(Slot, {
      at: "session.panel.end",
      render: (input) => (
        <Show when={prefs.value.panel && prefs.value.entry}>
          <QuotaEntry
            ctx={ctx}
            account={() => prefs.value.account || undefined}
            window={entryWindow}
            directory={() => input.session.directory}
            onOpen={() => ctx.layout.open(panelKey, input.session, { tab: "select" })}
          />
        </Show>
      ),
    });

    ctx.add(SettingsPage, {
      id: "usage",
      icon: "status",
      get title() {
        return ctx.t("settings.title");
      },
      get entries() {
        return [
          { id: "panel", title: ctx.t("settings.panel") },
          { id: "entry", title: ctx.t("settings.entry") },
          { id: "entryWindow", title: ctx.t("settings.entryWindow") },
          { id: "range", title: ctx.t("settings.range") },
          { id: "source", title: ctx.t("settings.source") },
        ];
      },
      render: () => (
        <UsageSettings
          ctx={ctx}
          panel={prefs.value.panel}
          onPanel={(value) =>
            prefs.update((draft) => {
              draft.panel = value;
            })
          }
          entry={prefs.value.entry}
          onEntry={(value) =>
            prefs.update((draft) => {
              draft.entry = value;
            })
          }
          entryWindow={entryWindow()}
          onEntryWindow={(value) =>
            prefs.update((draft) => {
              draft.entryWindow = value;
            })
          }
          range={range()}
          onRange={(value) =>
            prefs.update((draft) => {
              draft.range = value;
            })
          }
        />
      ),
    });
  },
});
