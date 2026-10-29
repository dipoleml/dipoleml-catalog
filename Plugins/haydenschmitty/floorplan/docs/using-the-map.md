# Using the map

The map is a board of cards connected by lines. Each card is a part of your app: a big area like "Main server", a group of files, a single file, or an endpoint (a request the server can receive). Lines show what uses what.

## Getting around

| To… | Do this |
|---|---|
| go inside a card | double-click it, or select it and press **Enter** |
| go back up | **Backspace**, the back arrow, or the breadcrumbs at the top |
| pan | drag the background |
| zoom | scroll, or **+** / **−** |
| fit everything on screen | **F**, or the frame button bottom-left |
| find anything | **/** or **Ctrl/⌘ K**, then type a name, file or URL |
| see details | click a card; the panel on the right fills in |
| show or hide the panel | **P**, or the panel button top-right |
| close a menu, stop a flow, clear a selection | **Esc** |

The details on cards simplify as you zoom out: descriptions drop away and titles get bigger, so the map stays readable from far away.

## Cards

- **Title and description:** a plain-English name, and one line on what it does.
- **Footer:** how much is inside (modules, files or endpoints) on the left. On the right, a green tag when it's part of recent work.
- **Endpoint cards** show the method and address (`POST /api/orders`) above their name.
- **A small amber dot** after a title means there's a note pinned to that file.
- **Pill-shaped cards at the edges** of a view are things outside it. The brackets above each column say which side is which:
  - **Used by:** outside parts that use or call into this one.
  - **Inside ‹name›:** what this part is made of.
  - **Uses:** outside parts it relies on, like a database or Stripe.

  Double-click an outside card to jump there.

<img src="images/inside.png" alt="Inside a part of the server: what uses it on the left, its files in the middle, outside services on the right">

Hover over a card for a moment to see what kind of thing it is, where it lives, and how big it is. Hover over a line to see what it carries, for example which endpoints a screen calls.

## The side panel

Click anything to see it in the panel: its full description, what it's part of, what's inside it, what it's **used by** and what it **depends on**, its endpoints, and buttons to open it or ask about it. With nothing selected, the panel describes the current view, or the whole app at the top level.

Drag the panel's left edge to resize it.

## Header buttons

### Health
A count of important issues, and a plain-language list of problems the scan found:
- passwords and keys written into the code, or into a committed `.env` file;
- endpoints that let anyone change or read data without signing in;
- files nothing uses;
- files over about 1,000 lines, which AI struggles to edit safely.

Each issue has **Show on map**, which highlights the affected files and endpoints with notes, and **Fix with Claude** (or **Fix with Codex**, for a map made in Codex), which copies a ready-made prompt naming the exact files and lines and the safe fix. It's a quick automatic check, not a security audit.

### Recent work
Appears when Claude or Codex has just changed things. It lays the changed cards out on one board, with what you asked for, a summary of what was done, and a note on every card. Elsewhere on the map, changed cards have a green ring and a **Changed** or **New** tag, and the parts that contain them show **N changed**, so you can follow the green down from the top level.

### Screens
Every page of your app that Floorplan detected. Pick one to see everything behind it: its components, the requests it makes, the server code that answers them, the data they touch, and outside services.

### Start here
Replays the one-minute tour that runs the first time you open a map.

### Flows
Guided walkthroughs of the app's main jobs, like "Checkout" or "Sign up". A flow moves across the board step by step, with a narration at each stop. Use **←** / **→** or the flow bar's buttons to step through, and **Esc** to stop.

**Request a new flow** lets you describe one in plain words ("how does a refund get back to the customer's card?"), and Claude or Codex traces it through the code. Flows you request are saved with the map.

### Filters
- **Show connections:** turn kinds of lines on or off (Uses, Web requests, Background jobs and so on).
- **Show technical detail:** switch to developer terms (Imports, HTTP, Queues), and show each file's exports.
- **Highlight recent work:** turn the green highlights off for a clean map.

## Asking questions

<img src="images/ask.png" alt="An answer board with numbered cards and a written walkthrough">

Type into the Ask bar at the bottom and press **Enter**. Claude or Codex answers in a few sentences and shows an **answer board**: just the cards involved, how they connect, a short note on each, and a numbered walkthrough when the answer is a sequence. Follow-up suggestions appear under the answer. **Back to map** returns to where you were.

- **Right-click → Ask about this** on any card or line adds it to your question as context.
- The label in the bar shows what's answering. **Claude Code** means the Claude Code CLI and **Codex** means Codex, both running on your computer and able to read your source code. **Claude** means the map was opened in the Claude app, which answers from the map alone.
- If neither is available, the bar explains what's needed. See [Troubleshooting](troubleshooting.md).

## Right-click menus

| On | You get |
|---|---|
| a card | Open · Show on the map · Ask about this · Show details · Copy name · Copy path (or endpoint) · Open in editor |
| a line | Ask about this connection · Show details |
| the background | Ask about this view · Up one level · Back to overview · Fit to screen · Search |

**Open in editor** opens the file in VS Code (or another editor that handles `vscode://` links) at the right line.
