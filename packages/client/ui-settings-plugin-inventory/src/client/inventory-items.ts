/**
 * Row ledger for the extra `settings.plugin.inventory.item` rows: the tab
 * dispatches the slot by key, so it renders exactly the keys that registered
 * cards claim. A row registered late joins the list without a wire call.
 */

import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** What the inventory tab renders beyond the Host loader entries. */
export interface PluginInventoryItemsState {
  /** Whether the slot ledger has been read once. */
  loaded: boolean
  /** Row keys to dispatch, in registration order. */
  keys: string[]
}

/** The registration-side face the tab's slot entry injects. */
export interface PluginInventoryItemsInjected {
  hooks: {
    /** Section snapshot bound by the renderer as usePluginInventoryItems. */
    pluginInventoryItems: SnapshotStore<PluginInventoryItemsState>
  }
}

/** Derives the extra-row keys from the slot ledger. */
export class PluginInventoryItemsController {
  private readonly store = createSnapshotStore<PluginInventoryItemsState>({
    loaded: false,
    keys: [],
  })
  private disposed = false

  /**
   * @param entries - reads the rows currently registered into the slot.
   */
  constructor(private readonly entries: () => readonly StoredEntry[]) {
    this.publish()
  }

  /** Republish after the slot ledger changed; a row registered late joins here. */
  refresh(): void {
    if (this.disposed) return
    this.publish()
  }

  /** Stop publishing. */
  dispose(): void {
    this.disposed = true
  }

  /** Build the face the tab's slot registration injects. */
  inject(): PluginInventoryItemsInjected {
    return { hooks: { pluginInventoryItems: this.store } }
  }

  private publish(): void {
    if (this.disposed) return
    const keys = this.entries().flatMap(entry =>
      entry.options.key !== undefined ? [entry.options.key] : [])
    const previous = this.store.getSnapshot()
    if (previous.loaded
      && previous.keys.length === keys.length
      && previous.keys.every((key, index) => key === keys[index])) return
    this.store.set({ loaded: true, keys })
  }
}
