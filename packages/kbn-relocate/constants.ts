/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

export const BASE_FOLDER = process.cwd() + '/';
export const BASE_FOLDER_DEPTH = process.cwd().split('/').length;
export const KIBANA_FOLDER = process.cwd().split('/').pop()!;
export const EXCLUDED_MODULES = ['@kbn/core'];

export const EXTENSIONS = [
  'eslintignore',
  'gitignore',
  'js',
  'mjs',
  'txt',
  'json',
  'lock',
  'bazel',
  'md',
  'mdz',
  'asciidoc',
  'sh',
  'snap',
  'ts',
  'jsonc',
  'xml',
  'yaml',
  'yml',
];

export const EXCLUDED_FOLDERS = [
  './api_docs', // autogenerated daily https://buildkite.com/elastic/kibana-api-docs-daily
  './.chromium',
  './.devcontainer',
  './.es',
  './.git',
  // './.github',
  './.native_modules',
  './.node_binaries',
  './.vscode',
  './.yarn-local-mirror',
  './build',
  './core_http.codeql',
  './data',
  './node_modules',
  './target',
  './test.codeql',
  './test2.codeql',
  './trash',
];

export const NO_GREP = EXCLUDED_FOLDERS.map((f) => `--exclude-dir "${f}"`).join(' ');

// These two constants are singletons, used and updated throughout the process
export const UPDATED_REFERENCES = new Set<string>();
export const UPDATED_RELATIVE_PATHS = new Set<string>();
export const SCRIPT_ERRORS: string[] = [];

export const YMDMS = new Date()
  .toISOString()
  .replace(/[^0-9]/g, '')
  .slice(0, -3);

export const DESCRIPTION = `relocate_${YMDMS}_description.out`;
export const NEW_BRANCH = `kbn-team-1309-relocate-${YMDMS}`;

export const GLOBAL_DESCRIPTION = dedent`
## Summary

This PR aims at relocating some of the Kibana modules (plugins and packages) into a new folder structure, according to the _Sustainable Kibana Architecture_ initiative.

> [!IMPORTANT]
> * We kindly ask you to:
>   * Manually fix the errors in the error section below (if there are any).
>   * Search for the \`packages[\/\\]\` and \`plugins[\/\\]\` patterns in the source code (Babel and Eslint config files), and update them appropriately.
>   * Manually review \`.buildkite/scripts/pipelines/pull_request/pipeline.ts\` to ensure that any CI pipeline customizations continue to be correctly applied after the changed path names
>   * Review all of the updated files, specially the \`.ts\` and \`.js\` files listed in the sections below, as some of them contain relative paths that have been updated.
>   * Think of potential impact of the move, including tooling and configuration files that can be pointing to the relocated modules. E.g.:
>     * customised eslint rules
>     * docs pointing to source code

> [!NOTE]
> * This PR has been auto-generated.
> * Any manual contributions will be lost if the 'relocate' script is re-run.
> * Try to obtain the missing reviews / approvals before applying manual fixes, and/or keep your changes in a .patch / git stash.
> * Please use [#sustainable_kibana_architecture](https://elastic.slack.com/archives/C07TCKTA22E) Slack channel for feedback.

Are you trying to rebase this PR to solve merge conflicts? Please follow the steps describe [here](https://elastic.slack.com/archives/C07TCKTA22E/p1734019532879269?thread_ts=1734019339.935419&cid=C07TCKTA22E).

`;
