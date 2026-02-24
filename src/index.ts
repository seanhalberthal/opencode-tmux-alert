import type { Plugin } from "@opencode-ai/plugin"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

/**
 * Tmux alert plugin for OpenCode.
 *
 * Sends visual alerts to tmux when OpenCode needs attention:
 * - Task completed (session idle)
 * - Permission requested
 * - Question asked (prompt append)
 *
 * Clears the alert when the user submits a message.
 *
 * Customise alert/clear scripts via environment variables:
 *   OPENCODE_ALERT_SCRIPT — path to a custom alert script
 *   OPENCODE_CLEAR_SCRIPT — path to a custom clear script
 */
export const TmuxAlertPlugin: Plugin = async ({ $ }) => {
  const pluginDir = dirname(fileURLToPath(import.meta.url))
  const scriptsDir = resolve(pluginDir, "../scripts")

  const alertScript =
    process.env.OPENCODE_ALERT_SCRIPT ?? resolve(scriptsDir, "alert.sh")
  const clearScript =
    process.env.OPENCODE_CLEAR_SCRIPT ?? resolve(scriptsDir, "clear.sh")

  if (!process.env.TMUX) {
    console.error(
      "[opencode-tmux-alert] Not running inside tmux — plugin disabled",
    )
    return {}
  }

  const alert = async () => {
    await $`${alertScript}`
  }

  const clear = async () => {
    await $`${clearScript}`
  }

  return {
    event: async ({ event }) => {
      try {
        // Task completed — session is now idle
        if (event.type === "session.idle") {
          await alert()
        }

        // Permission requested
        if (event.type === "permission.updated") {
          await alert()
        }

        // Tool pending permission approval
        if (
          event.type === "message.part.updated" &&
          event.properties.part.type === "tool" &&
          event.properties.part.state.status === "pending"
        ) {
          await alert()
        }

        // Agent asking a question
        if (event.type === "tui.prompt.append") {
          await alert()
        }

        // User submitted a message — clear the alert
        if (
          event.type === "message.updated" &&
          event.properties.info.role === "user"
        ) {
          await clear()
        }
      } catch (error) {
        console.error("[opencode-tmux-alert] Error:", error)
      }
    },
  }
}
