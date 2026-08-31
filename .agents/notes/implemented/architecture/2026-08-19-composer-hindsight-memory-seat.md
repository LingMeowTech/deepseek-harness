# Agent Note: Composer Hindsight memory seat — a plugin slot beside the access-mode control

Status: implemented

English | [中文](2026-08-19-composer-hindsight-memory-seat.zh.md)

## Problem

The LMTech `@lingmeow.tech/dsh-hindsight-memory` plugin needs a per-session
toggle beside the composer's access-mode control to enable long-term memory and
select which memory banks to use. The composer tool row exposes two named
single control seats (`conversation.input.plan`, `conversation.input.model`),
both declared by `ui-conversation` and filled by their owning plugins. There is
no seat adjacent to the access-mode control where a plugin-owned memory
affordance can mount, so the plugin has no supported extension point for a
switch and bank multi-select in the input bar.

## Decision

Add a third named single seat, `conversation.input.hindsight`, rendered in the
composer tool row immediately right of the plan seat and beside the
access-mode control. It follows the same contract as the plan/model seats:

- declared in `ui-conversation`'s `SlotMap` with owner `InputControlOwnerProps`
  (only `locked`);
- declared in the `conversation.composer.bar` entry's `children` table;
- rendered via `renderSlot('conversation.input.hindsight', { locked })` in
  `InputBar`'s `.modes` row;
- renders nothing while empty, so an absent registrant costs no layout.

The seat is per-session scoped, matching the plugin's per-session enable and
bank-selection state. `ui-conversation` owns only the extension point; the
Hindsight memory toggle and bank multi-select live in the consumer plugin.

## Consequences

- New public slot `conversation.input.hindsight` on the composer bar.
- `ComposerBarProps.renderSlot` dispatches a third seat; the owner share is the
  bar's `locked` disable state, so the filling entry honours it.
- `ui-conversation` component tests updated to cover the seat's dispatch and
  that a registered entry fills it and receives the `locked` owner prop.

## Alternatives considered

- **Reuse `conversation.input.left`** — that seat is a `list` inside the tool
  row, but entries there are not guaranteed to sit immediately beside the
  access-mode control (the plan seat already occupies that adjacency), and the
  plugin needs a single named seat with a stable `locked` owner prop. A named
  single seat matches the plan/model precedent and gives the consumer a precise
  mount point.
- **Do nothing and keep the switch out of the bar** — the user explicitly wants
  the memory toggle beside Full access; without the seat the plugin would have
  to reach into core composer internals, which the slot system forbids.
