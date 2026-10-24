import { describe, expect, it } from "vitest"

import { parseSSE, type SSEMessage } from "./sse"

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<SSEMessage[]> {
  const messages: SSEMessage[] = []
  for await (const message of parseSSE(stream)) messages.push(message)
  return messages
}

describe("parseSSE", () => {
  it("parses named events", async () => {
    const messages = await collect(
      streamOf('event: token\ndata: {"text":"Hi"}\n\n'),
    )
    expect(messages).toEqual([
      { event: "token", data: '{"text":"Hi"}', id: undefined },
    ])
  })

  it("reassembles an event split across chunks", async () => {
    const messages = await collect(
      streamOf("event: tok", 'en\ndata: {"te', 'xt":"Salama"}\n', "\n"),
    )
    expect(messages).toEqual([
      { event: "token", data: '{"text":"Salama"}', id: undefined },
    ])
  })

  it("handles CRLF split between chunks without emitting early", async () => {
    const messages = await collect(streamOf("data: a\r", "\ndata: b\r\n\r\n"))
    expect(messages).toEqual([
      { event: "message", data: "a\nb", id: undefined },
    ])
  })

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("data: Antananarivô\n\n")
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 18))
        controller.enqueue(bytes.slice(18))
        controller.close()
      },
    })
    expect((await collect(stream))[0].data).toBe("Antananarivô")
  })

  it("ignores comments and keeps the last event id", async () => {
    const messages = await collect(
      streamOf(": ping\n\nid: 7\nevent: done\ndata: {}\n\n"),
    )
    expect(messages).toEqual([{ event: "done", data: "{}", id: "7" }])
  })

  it("discards an incomplete event at end of stream", async () => {
    const messages = await collect(
      streamOf("event: token\ndata: ok\n\nevent: token\ndata: cut"),
    )
    expect(messages).toHaveLength(1)
  })
})
