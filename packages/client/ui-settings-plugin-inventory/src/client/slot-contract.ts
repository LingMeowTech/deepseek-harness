/**
 * The `settings.plugin.inventory.item` slot type — one extra row inside the
 * plugin-inventory tab, keyed by the plugin id the row controls. The official
 * loader inventory stays read-only; feature plugins (e.g. a runtime plugin
 * manager) register rows under this key to surface their own dynamically
 * managed plugins with load/unload affordances.
 *
 * TYPE HOME RATIONALE: the tab declares this slot at runtime, and a plugin
 * registering a row already depends on this package for the slot's
 * declaration. The type therefore lives with its declarer.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** One extra row inside the plugin inventory list (keyed by plugin id). */
    'settings.plugin.inventory.item': {
      kind: 'keyed'
      scope: 'root'
      owner: PluginInventoryItemOwnerProps
    }
  }
}

/** Owner share of one inventory row (the tab supplies nothing). */
export interface PluginInventoryItemOwnerProps {
  /** Marker field: row owner props are intentionally empty. */
  children?: never
}
