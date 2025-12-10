// api/lambda/agent.ts
import fs from 'fs';
import path from 'path';
import { tavilySearch } from './tavily';
import { connectDB } from '../modules/utils/db';
import { Messages } from '../modules/Messages';
import { Conversations } from '../modules/Conversations';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bff.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function log(msg: string) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
}

const DECISION_WINDOW = 3;

export async function post({ data }: any) {
  try {
    log("BFF received request: " + JSON.stringify(data));

    const { conversationId, message, userId } = data || {};
    if (!conversationId || !message || !userId) {
      log("ERROR: missing conversationId/message/userId");
      return { status: 400, json: { error: "Missing conversationId/message/userId" } };
    }

    const apiKey = process.env.VOLCENGINE_API_KEY;
    const endpoint = process.env.VOLCENGINE_ENDPOINT;
    const baseURL = process.env.VOLCENGINE_BASE_URL;

    if (!apiKey || !endpoint || !baseURL) {
      log("ERROR: missing API env vars");
      return { status: 500, json: { error: "Missing VOLCENGINE env vars" } };
    }

    // ---------- 数据库准备 ----------
    const db = await connectDB();
    const messagesDB = new Messages(db);
    const conversationsDB = new Conversations(db);

    // ---------- 确保会话存在 ----------
    const exists = await conversationsDB.exists(conversationId);
    if (!exists) {
      log(`Conversation ${conversationId} 不存在，自动创建`);
      await conversationsDB.createConversation(conversationId, '新会话');
    }

    // ---------- 保存用户消息 ----------
    await messagesDB.createMessage({
      userId,
      conversationId,
      role: 'user',
      content: message
    });

    // ---------- 拉取历史消息，仅保留 role 和 content ----------
    const history = await messagesDB.getMessagesByConversation(conversationId, userId);
    const allMessages = [
      ...history.map(m => ({
        role: m.role,
        content: m.content,
      }))
    ];

    // ---------- 决策阶段（非流式） ----------
    const decisionWindowMessages = allMessages.slice(-DECISION_WINDOW);
    log("Decision window messages: " + JSON.stringify(decisionWindowMessages));

    const decisionPayload = {
      model: endpoint,
      messages: decisionWindowMessages,
      stream: false,
      tools: [
        {
          name: "Tavily Search",
          description: "Search the internet using Tavily",
          type: "function",
          function: {
            name: "tavily_search",
            parameters: {
              type: "object",
              properties: { query: { type: "string", description: "Search query" } },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto"
    };

    const decisionResp = await fetch(baseURL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(decisionPayload)
    });

    if (!decisionResp.ok) {
      const errText = await decisionResp.text();
      log("Decision phase failed: " + errText);
      return { status: decisionResp.status, json: { error: errText } };
    }

    const decisionData = await decisionResp.json();
    log("Decision phase response: " + JSON.stringify(decisionData));

    // ---------- Tavily 工具处理（可选） ----------
    let toolResultContent: string | null = null;
    const toolCall = decisionData?.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall && toolCall.function?.name === "tavily_search") {
      log("Tool call detected: tavily_search");
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const query = args.query;

      if (query) {
        log("Tavily search query: " + query);
        try {
          const tavilyResult = await tavilySearch(query);
          toolResultContent = tavilyResult || "No results found.";
          log("Tavily search result: " + toolResultContent);
        } catch (err: any) {
          log("Tavily search exception: " + (err?.stack || JSON.stringify(err)));
          toolResultContent = "No results found due to search error.";
        }
      } else {
        log("Tool call missing 'query' parameter.");
        toolResultContent = "No results found: missing query parameter.";
      }
    } else {
      log("No Tavily tool call needed.");
    }

    // ---------- SSE 流式请求模型，仅传递 role 和 content ----------
    const finalMessages: any[] = [...allMessages];
    if (toolResultContent) {
      finalMessages.push({
        role: "tool",
        content: toolResultContent,
        tool_call_id: toolCall.id
      });
    }
    log("Final messages for SSE: " + JSON.stringify(finalMessages));

    const finalResp = await fetch(baseURL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: endpoint,
        stream: true,
        messages: finalMessages
      })
    });

    if (!finalResp.ok || !finalResp.body) {
      const errText = await finalResp.text();
      log("Final SSE phase failed: " + errText);
      return { status: finalResp.status, json: { error: errText } };
    }

    const reader = finalResp.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace('data:', '').trim();
            if (!jsonStr) continue;
            if (jsonStr === '[DONE]') break;

            let parsed: any;
            try { parsed = JSON.parse(jsonStr); } catch { continue; }

            const deltaContent =
              parsed?.choices?.[0]?.delta?.content ??
              parsed?.delta?.content ??
              parsed?.choices?.[0]?.message?.content ??
              '';

            assistantContent += deltaContent;

            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ delta: deltaContent })}\n\n`)
            );
          }
        }

        controller.close();

        try {
          await messagesDB.createMessage({
            userId: userId,
            conversationId,
            role: 'assistant',
            content: assistantContent
          });
          log(`Assistant message saved for conversation ${conversationId}`);
        } catch (err) {
          if (err instanceof Error) log("Save assistant message failed: " + err.stack);
          else log("Save assistant message failed: " + JSON.stringify(err));
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (err) {
    if (err instanceof Error) log("BFF exception: " + err.stack);
    else log("BFF exception: " + JSON.stringify(err));
    return { status: 500, json: { error: String(err) } };
  }
}
