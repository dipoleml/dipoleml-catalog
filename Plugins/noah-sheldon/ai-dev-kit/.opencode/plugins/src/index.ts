import { definePlugin, tool } from "@opencode-ai/plugin";
import { z } from "zod";

export default definePlugin(async (ctx) => {
  return {
    tool: {
      "git-summary": {
        description: "Show git status, recent commits, and active branches",
        args: z.object({
          limit: z.number().optional().default(5),
        }),
        execute: async ({ limit }) => {
          const status = await ctx.$`git status --short`.text();
          const log = await ctx.$`git log --oneline -${limit}`.text();
          const branch = await ctx.$`git branch --show-current`.text();
          return `Branch: ${branch.trim()}\n\nStatus:\n${status}\n\nRecent commits:\n${log}`;
        },
      },
      "list-skills": {
        description: "List all available skills in the AI Dev Kit",
        args: z.object({
          query: z.string().optional(),
        }),
        execute: async ({ query }) => {
          const result = await ctx.$`find skills -name SKILL.md -type f`.text();
          const skills = result.trim().split("\n").map((p) => p.replace("skills/", "").replace("/SKILL.md", ""));
          const filtered = query
            ? skills.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
            : skills;
          return `Available skills (${filtered.length}):\n${filtered.map((s) => `  - ${s}`).join("\n")}`;
        },
      },
    },

    event: {
      "file.edited": async (payload) => {
        // Track console.log usage in edited files
        const content = payload.content ?? "";
        if (content.includes("console.log") || content.includes("print(")) {
          console.log(`[ai-dev-kit] Debug statement detected in ${payload.file}`);
        }
      },

      "session.created": async () => {
        console.log("[ai-dev-kit] Session started — AI Dev Kit plugin loaded");
      },

      "tool.execute.after": async (payload) => {
        // Log tool execution for observability
        console.log(`[ai-dev-kit] Tool executed: ${payload.toolName}`);
      },
    },

    config: {
      instructions: [
        "AGENTS.md",
        "README.md",
        "skills/tdd-workflow/SKILL.md",
        "skills/code-review/SKILL.md",
        "skills/security-review/SKILL.md",
      ],
    },
  };
});
