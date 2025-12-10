export async function tavilySearch(query: string): Promise<string> {
    const url = "https://api.tavily.com/search";
    try {
      const body = JSON.stringify({ query });
      console.log(`[Tavily] Sending search request: ${body}`);

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body,
      });

      console.log(`[Tavily] Response status: ${resp.status} ${resp.statusText}`);

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`[Tavily] API returned error: ${text}`);
        return "No results found due to search error.";
      }

      const data: any = await resp.json();
      console.log(`[Tavily] Raw response: ${JSON.stringify(data)}`);

      // Tavily 正确返回字段为 answer / results
      if (data.answer) {
        return data.answer;
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results
          .map((r: { content?: string }) => r.content || "")
          .join("\n\n");
      }

      return "No results found.";

    } catch (err: any) {
      console.error(`[Tavily] Exception: ${err?.stack || err}`);
      return "No results found due to search error.";
    }
  }



