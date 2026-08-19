# dsh-mcp-grafana

DSH bundle that mounts the Grafana MCP server over Streamable HTTP.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `grafana` that connects to:

- Endpoint: `https://mcp.grafana.com/mcp` (Streamable HTTP)
- Header: `X-Grafana-URL: <your stack URL>` — Grafana uses this to route the MCP session to your instance

Discovered tools are exposed to the model as `mcp__grafana__<tool>`.

## Requirements

- A Grafana Cloud stack URL, exported to the environment, never committed:

  ```sh
  export GRAFANA_URL='https://<your-stack>.grafana.net'
  ```

  The patch reads it at load time with `!!js process.env.GRAFANA_URL` and sends it as the `X-Grafana-URL` header. The value is required — the row fails to load if the variable is missing, because the mcp-client headers schema rejects an empty header value.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-grafana   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-grafana
```

## Notes

- Change the stack URL by re-exporting `GRAFANA_URL` and restarting `dsh`; the value is read once at load time.
- The `X-Grafana-URL` header is required by Grafana's MCP endpoint; without it the server rejects the session.
