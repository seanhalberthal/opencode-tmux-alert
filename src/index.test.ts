import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test"
import { TmuxAlertPlugin } from "./index"

// --- Mock shell helper ---

function createMockShell() {
  const calls: string[] = []
  const mock$ = (strings: TemplateStringsArray, ...expressions: unknown[]) => {
    let command = ""
    strings.forEach((str, i) => {
      command += str
      if (i < expressions.length) command += String(expressions[i])
    })
    calls.push(command.trim())
    return Promise.resolve()
  }
  return { $: mock$ as any, calls }
}

function createThrowingShell() {
  const mock$ = () => {
    return Promise.reject(new Error("shell execution failed"))
  }
  return { $: mock$ as any }
}

// --- Environment variable isolation ---

let savedTmux: string | undefined
let savedAlertScript: string | undefined
let savedClearScript: string | undefined

beforeEach(() => {
  savedTmux = process.env.TMUX
  savedAlertScript = process.env.OPENCODE_ALERT_SCRIPT
  savedClearScript = process.env.OPENCODE_CLEAR_SCRIPT

  // Default: running inside tmux
  process.env.TMUX = "/tmp/tmux-1000/default,12345,0"
  delete process.env.OPENCODE_ALERT_SCRIPT
  delete process.env.OPENCODE_CLEAR_SCRIPT
})

afterEach(() => {
  if (savedTmux !== undefined) {
    process.env.TMUX = savedTmux
  } else {
    delete process.env.TMUX
  }
  if (savedAlertScript !== undefined) {
    process.env.OPENCODE_ALERT_SCRIPT = savedAlertScript
  } else {
    delete process.env.OPENCODE_ALERT_SCRIPT
  }
  if (savedClearScript !== undefined) {
    process.env.OPENCODE_CLEAR_SCRIPT = savedClearScript
  } else {
    delete process.env.OPENCODE_CLEAR_SCRIPT
  }
})

// --- Tests ---

describe("TMUX guard", () => {
  test("returns empty object when TMUX is not set", async () => {
    delete process.env.TMUX
    const { calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $: createMockShell().$ } as any)
    expect(result).toEqual({})
    expect(calls).toHaveLength(0)
  })

  test("logs error message when not in tmux", async () => {
    delete process.env.TMUX
    const spy = spyOn(console, "error").mockImplementation(() => {})
    await TmuxAlertPlugin({ $: createMockShell().$ } as any)
    expect(spy).toHaveBeenCalledWith(
      "[opencode-tmux-alert] Not running inside tmux — plugin disabled",
    )
    spy.mockRestore()
  })

  test("returns hooks with event handler when TMUX is set", async () => {
    const { $ } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    expect(result).toHaveProperty("event")
    expect(typeof result.event).toBe("function")
  })
})

describe("Script path resolution", () => {
  test("uses bundled alert.sh by default", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "session.idle" } } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/scripts\/alert\.sh$/)
  })

  test("uses bundled clear.sh by default", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.updated",
        properties: { info: { role: "user" } },
      },
    } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/scripts\/clear\.sh$/)
  })

  test("uses OPENCODE_ALERT_SCRIPT env var when set", async () => {
    process.env.OPENCODE_ALERT_SCRIPT = "/custom/alert.sh"
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "session.idle" } } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe("/custom/alert.sh")
  })

  test("uses OPENCODE_CLEAR_SCRIPT env var when set", async () => {
    process.env.OPENCODE_CLEAR_SCRIPT = "/custom/clear.sh"
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.updated",
        properties: { info: { role: "user" } },
      },
    } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe("/custom/clear.sh")
  })
})

describe("Alert event routing", () => {
  test("session.idle triggers alert script", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "session.idle" } } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/alert\.sh$/)
  })

  test("permission.updated triggers alert script", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "permission.updated" } } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/alert\.sh$/)
  })

  test("message.part.updated with tool type and pending status triggers alert script", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", state: { status: "pending" } },
        },
      },
    } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/alert\.sh$/)
  })

  test("tui.prompt.append triggers alert script", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "tui.prompt.append" } } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/alert\.sh$/)
  })
})

describe("Clear event routing", () => {
  test("message.updated with user role triggers clear script", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.updated",
        properties: { info: { role: "user" } },
      },
    } as any)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/clear\.sh$/)
  })
})

describe("Negative cases", () => {
  test("message.part.updated with tool type and running status does NOT trigger alert", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", state: { status: "running" } },
        },
      },
    } as any)
    expect(calls).toHaveLength(0)
  })

  test("message.part.updated with non-tool part type does NOT trigger alert", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.part.updated",
        properties: {
          part: { type: "text", state: { status: "pending" } },
        },
      },
    } as any)
    expect(calls).toHaveLength(0)
  })

  test("message.updated with assistant role does NOT trigger alert or clear", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: {
        type: "message.updated",
        properties: { info: { role: "assistant" } },
      },
    } as any)
    expect(calls).toHaveLength(0)
  })

  test("unhandled event type triggers neither alert nor clear", async () => {
    const { $, calls } = createMockShell()
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({
      event: { type: "some.unknown.event" },
    } as any)
    expect(calls).toHaveLength(0)
  })
})

describe("Error handling", () => {
  test("shell error is caught and logged to console.error", async () => {
    const { $ } = createThrowingShell()
    const spy = spyOn(console, "error").mockImplementation(() => {})
    const result = await TmuxAlertPlugin({ $ } as any)
    await result.event!({ event: { type: "session.idle" } } as any)
    expect(spy).toHaveBeenCalledWith(
      "[opencode-tmux-alert] Error:",
      expect.any(Error),
    )
    spy.mockRestore()
  })

  test("event handler resolves even when shell throws", async () => {
    const { $ } = createThrowingShell()
    const spy = spyOn(console, "error").mockImplementation(() => {})
    const result = await TmuxAlertPlugin({ $ } as any)
    // Should not reject
    await expect(
      result.event!({ event: { type: "session.idle" } } as any),
    ).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
