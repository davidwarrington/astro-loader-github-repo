import { AstroError } from 'astro/errors';
import { type Loader } from 'astro/loaders';
import { Octokit, RequestError } from 'octokit';

type OctokitOptions = ConstructorParameters<typeof Octokit>[0];

export function defineGithubRepoLoader(options: OctokitOptions) {
  const github = new Octokit(options);

  return function ({
    owner,
    path,
    repo,
    schema,
  }: {
    owner: string;
    path: string;
    repo: string;
    schema?: Loader['schema'];
  }): Loader {
    async function getRepo({ headers }: { headers: Record<string, string> }) {
      try {
        const repository = await github.rest.repos.getContent({
          owner,
          repo,
          path,
          headers,
        });

        if (!Array.isArray(repository.data)) {
          throw new AstroError('Collection must be a directory.');
        }

        return {
          data: repository.data,
          headers: repository.headers,
          hasChanged: true,
        } as const;
      } catch (error) {
        if (!(error instanceof RequestError)) {
          throw error;
        }

        console.log(error.status);

        return { hasChanged: false } as const;
      }
    }

    async function getFileFromRepo(path: string) {
      const file = await github.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(file.data) || file.data.type !== 'file') {
        return;
      }

      return atob(file.data.content);
    }

    return {
      name: 'github-repo-loader',
      async load({ generateDigest, logger, meta, store }) {
        logger.info(`Loading repo: ${owner}/${repo}/${path}`);

        const headers: Record<string, string> = {};
        const ifNoneMatch = meta.get('if-none-match');
        if (ifNoneMatch) {
          headers['if-none-match'] = ifNoneMatch;
        }

        logger.info(`ifNoneMatch ${ifNoneMatch}`);

        const repository = await getRepo({ headers });

        if (!repository.hasChanged) {
          logger.info('Repo not modified, skipping');
          return;
        }

        if (repository.headers.etag) {
          meta.set('if-not-match', repository.headers.etag);
        }

        const files = repository.data.filter(item => item.type === 'file');

        store.clear();

        for (const file of files) {
          const content = await getFileFromRepo(file.path);

          if (content === undefined) {
            continue;
          }

          const digest = generateDigest(content);

          store.set({
            id: file.path,
            data: {},
            rendered: {
              html: content,
            },
            digest,
          });
        }
      },
      schema,
    };
  };
}
