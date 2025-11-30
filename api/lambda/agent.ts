// api/lambda/agent.ts
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bff.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function log(msg: string) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
}

export async function post({ data }: any) {
  try {
    log("BFF received request: " + JSON.stringify(data));

    if (!data?.messages) {
      log("ERROR: missing messages");
      return { status: 400, json: { error: "missing messages" } };
    }

    const apiKey = process.env.VOLCENGINE_API_KEY;
    const endpoint = process.env.VOLCENGINE_ENDPOINT;
    const baseURL = process.env.VOLCENGINE_BASE_URL;

    if (!apiKey || !endpoint || !baseURL) {
      log("ERROR: missing API env vars");
      return { status: 500, json: { error: "missing env vars" } };
    }

    // ---- 发送到 Doubao （使用 stream: true）----
    const upstream = await fetch(baseURL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: endpoint,
        stream: true,
        messages: data.messages,
        // thinking: { type: "deep" },
        //thinking: { type: "enabled" },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      log("Upstream failed: " + err);
      return { status: upstream.status, json: { error: err } };
    }

    log("Upstream stream connected, begin passthrough.");

    // ***关键：直接透传 response.body（SSE 流）***
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err: any) {
    log("BFF exception: " + err?.stack || err);
    return { status: 500, json: { error: String(err) } };
  }
}
