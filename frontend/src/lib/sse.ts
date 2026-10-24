export interface SSEMessage {
  event: string
  data: string
  id?: string
}

const LINE_BREAK = /\r\n|\r|\n/

/**
 * Parses a Server-Sent Events stream as specified by WHATWG.
 * Buffers partial lines so events split across network chunks are reassembled.
 * https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
 */
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEMessage> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let event = ""
  let data: string[] = []
  let id: string | undefined

  try {
    while (true) {
      const { value, done } = await reader.read()
      // Pending data at end of stream is discarded, per spec.
      if (done) return

      buffer += decoder.decode(value, { stream: true })
      // A trailing "\r" may be the first half of "\r\n": keep it for the next chunk.
      const holdCR = buffer.endsWith("\r")
      const lines = (holdCR ? buffer.slice(0, -1) : buffer).split(LINE_BREAK)
      buffer = (lines.pop() ?? "") + (holdCR ? "\r" : "")

      for (const line of lines) {
        if (line === "") {
          if (data.length > 0) {
            yield { event: event || "message", data: data.join("\n"), id }
          }
          event = ""
          data = []
          continue
        }
        if (line.startsWith(":")) continue

        const colon = line.indexOf(":")
        const field = colon === -1 ? line : line.slice(0, colon)
        let fieldValue = colon === -1 ? "" : line.slice(colon + 1)
        if (fieldValue.startsWith(" ")) fieldValue = fieldValue.slice(1)

        if (field === "event") event = fieldValue
        else if (field === "data") data.push(fieldValue)
        else if (field === "id" && !fieldValue.includes("\0")) id = fieldValue
      }
    }
  } finally {
    reader.releaseLock()
  }
}
