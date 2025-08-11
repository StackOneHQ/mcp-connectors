Rules:

- Use the `mcpConnectorConfig` function to create a connector config
- Export it from the file.
- Keep the connector config fully enclosed in the file.

- there are some util functions you can use in connectors in /utils.
- use fetch to make api calls. do not use external libraries unless you have to.
- use javascript code which will run on modern versions of node, bun and cloudflare workers.
- do not use any niche features which may not be supported by all three of those runtimes.

- write good descriptions for all capabilities on the connector config.
- describes for the credentials and setup will be user facing so keep them short and descriptive for a user.

- run check, test and build before submitting a PR.
