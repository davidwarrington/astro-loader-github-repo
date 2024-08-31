# astro-loader-github-repo

Pull content from separate GitHub repos into Astro Content Layer.

## Installation

```shell
pnpm add --save-dev astro-loader-github-repo
```

## Setup

```ts
// src/content/config.ts

import { defineGithubRepoLoader } from 'astro-loader-github-repo';

const githubRepoLoader = defineGithubRepoLoader({
  auth: '[github-token]',
});

const articles = defineCollection({
  loader: githubRepoLoader({
    owner: '[github-username]',
    repo: '[github-repo]',
    path: '[path/to/files]',
  }),
});

export const collections = {
  articles,
};
```
