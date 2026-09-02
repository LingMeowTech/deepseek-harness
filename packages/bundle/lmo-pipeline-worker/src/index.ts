/**
 * @deepseek-ai/dsh-bundle-lmo-pipeline-worker — the LMO pipeline worker
 * composition: a `dsh --profile` bundle layer (`cordis.patch.yml`) over
 * dsh-base, a flat `worker.cordis.yml` for the `DSH_CORDIS_CONFIG` handshake,
 * the frozen model-visible persona text (`src/prompts.ts`), and the
 * pipeline-session tag-writer companion (`src/pipeline-worker-tags.ts`).
 * This module carries no runtime API.
 * @module @deepseek-ai/dsh-bundle-lmo-pipeline-worker
 */

export * from './prompts.ts'
export * from './pipeline-worker-tags.ts'
