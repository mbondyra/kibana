/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { getDashboardReviewPromptContent } from './dashboard_guidance';

const hitlGuidance = `## Prettifying a Dashboard

Judge only the checklist below — do not re-walk the skill design guide. Do not apply fixes yet. Do not write findings in chat — issues belong only in the form option descriptions.

Categories (omit empty): **Layout** (\`grid\`), **Chart styling** (\`metric\`/\`xy\`/\`pie\`), **Structure** (\`controls\`/\`composition\`). If none: say you found nothing to fix and stop.

First output: \`ask_user_question\` alone, once, one \`multi_select\`. Question text only. Labels: \`Layout\`, \`Chart styling\`, \`Structure\`. Each option: one short clause per issue (about 5–10 words). Always add **All of them**.

After they answer: ${dashboardTools.generateDashboard} once with \`dashboardAttachmentId\` for the chosen categories. Treat **All of them** as every non-empty category. Apply only the review criticals. Do not \`edit_panels\` a panel you will \`remove_panels\`. Do not ask again this round.`;

/**
 * Short Enhance playbook: HITL first, then a failure checklist.
 * Loaded only via `read_file` on the referenced prettify path.
 */
export const getDashboardPrettifyPromptContent = (): string =>
  [hitlGuidance, getDashboardReviewPromptContent()].filter(Boolean).join('\n\n');
