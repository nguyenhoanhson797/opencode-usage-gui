/**
 * The Usage page in OpenCode's Settings: which surfaces show, the range a new tab opens with,
 * and where the numbers come from. The switches save through the plugin's own store, so no file
 * in OpenCode's config folder is edited.
 */
import type { Context } from "@opencode/plugin/gui";
import {
  QUOTA_WINDOW_KEYS,
  USAGE_RANGES,
  type QuotaWindowKey,
  type UsageRange,
} from "../types.js";

export type UsageSettingsProps = {
  ctx: Context;
  panel: boolean;
  onPanel: (value: boolean) => void;
  entry: boolean;
  onEntry: (value: boolean) => void;
  entryWindow: QuotaWindowKey;
  onEntryWindow: (value: QuotaWindowKey) => void;
  range: UsageRange;
  onRange: (value: UsageRange) => void;
};

export function UsageSettings(props: UsageSettingsProps) {
  const ctx = props.ctx;
  const ui = ctx.ui;

  return (
    <ui.SettingsLayout title={ctx.t("settings.title")} description={ctx.t("settings.description")}>
      <ui.SettingsSection title={ctx.t("settings.section.surfaces")}>
        <ui.SettingsRow
          id="panel"
          title={ctx.t("settings.panel")}
          description={ctx.t("settings.panel.description")}
        >
          <ui.Switch
            label={ctx.t("settings.panel")}
            hideLabel
            checked={props.panel}
            onChange={props.onPanel}
          />
        </ui.SettingsRow>
        <ui.SettingsRow
          id="entry"
          title={ctx.t("settings.entry")}
          description={ctx.t("settings.entry.description")}
        >
          <ui.Switch
            label={ctx.t("settings.entry")}
            hideLabel
            checked={props.entry}
            disabled={!props.panel}
            onChange={props.onEntry}
          />
        </ui.SettingsRow>
        <ui.SettingsRow
          id="entryWindow"
          title={ctx.t("settings.entryWindow")}
          description={ctx.t("settings.entryWindow.description")}
        >
          <ui.Select
            label={ctx.t("settings.entryWindow")}
            value={props.entryWindow}
            disabled={!props.panel || !props.entry}
            options={QUOTA_WINDOW_KEYS.map((window) => ({
              value: window,
              label: ctx.t(`limits.${window}`),
            }))}
            onChange={(value) => props.onEntryWindow(value as QuotaWindowKey)}
          />
        </ui.SettingsRow>
      </ui.SettingsSection>

      <ui.SettingsSection title={ctx.t("settings.section.defaults")}>
        <ui.SettingsRow
          id="range"
          title={ctx.t("settings.range")}
          description={ctx.t("settings.range.description")}
        >
          <ui.Select
            label={ctx.t("settings.range")}
            value={props.range}
            options={USAGE_RANGES.map((range) => ({
              value: range,
              label: ctx.t(`range.${range}`),
            }))}
            onChange={(value) => props.onRange(value as UsageRange)}
          />
        </ui.SettingsRow>
      </ui.SettingsSection>

      <ui.SettingsSection title={ctx.t("settings.section.data")}>
        <ui.SettingsRow
          id="source"
          title={ctx.t("settings.source")}
          description={ctx.t("settings.source.description")}
        />
        <ui.SettingsRow
          id="privacy"
          title={ctx.t("settings.privacy")}
          description={ctx.t("settings.privacy.description")}
        />
      </ui.SettingsSection>
    </ui.SettingsLayout>
  );
}
