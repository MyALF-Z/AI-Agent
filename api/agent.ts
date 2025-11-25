export const POST = async () => {
  return new Response(
    new ReadableStream({
      async start(controller) {
        controller.enqueue(
          JSON.stringify({ type: 'thinking', text: '正在检索知识…' }) + '\n',
        );

        await new Promise((r) => setTimeout(r, 600));
        controller.enqueue(
          JSON.stringify({ type: 'thinking', text: '、分析问题…' }) + '\n',
        );

        await new Promise((r) => setTimeout(r, 600));
        controller.enqueue(
          JSON.stringify({ type: 'content', text: '你好，我是 AI 助手。' }) + '\n',
        );

        await new Promise((r) => setTimeout(r, 600));
        controller.enqueue(
          JSON.stringify({ type: 'content', text: ' 有什么可以帮你？' }) + '\n',
        );

        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    },
  );
};







