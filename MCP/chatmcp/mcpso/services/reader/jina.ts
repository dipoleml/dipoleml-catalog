import { Post } from "@/types/post";

export async function readUrl(url: string): Promise<Post | undefined> {
  try {
    const uri = "https://r.jina.ai/";

    console.log("jina url", uri, url);
    const resp = await fetch(uri, {
      method: "POST",
      body: JSON.stringify({
        url: url,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Return-Format": "markdown",
        "X-Timeout": "10",
        // "X-No-Cache": "true",
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      throw new Error("read url failed with status: " + resp.status);
    }

    const res = await resp.json();
    console.log("jina resp", res);

    const { code, status, data } = res;
    if (code !== 200) {
      throw new Error("read url failed with status: " + status);
    }

    const { title, description, content } = data;

    return {
      url: url,
      title: title,
      description: description,
      content: content,
    };
  } catch (err) {
    console.log("read url failed: ", err);
    throw err;
  }
}
