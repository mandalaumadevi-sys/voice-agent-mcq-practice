/* Lost in Orbit — escape room for "Building Coding Agent using LangGraph - Part 3" (the CLI session).
   Every question comes from the finalized Part 3 slides and building-claude-code-langgraph/final-code/part_3_final.py.
   Each lock asks 2 questions and gives the item that opens the next lock. Object fields:
     needs  item that must be used on it first (null = opens once the previous lock is solved)
     at     [x, y] in the scene where the item flies to
     use    sound + animation name, useMs = how long the "item works" animation runs
     gives  item found inside, from = scene selector of the item when it is not inside .gift */

const SHOW_MESSAGES = [
  'def show_messages(messages, already_shown):',
  '    for m in messages[already_shown:]:',
  '        if m.type == "ai":',
  '            if m.text:',
  '                console.print(f"\\n:white_circle: {escape(m.text)}")',
  '            for call in m.tool_calls:',
  '                console.print(f"\\n:green_circle: [bold]{call[\'name\']}[/] {escape(str(call[\'args\']))}")',
  '        elif m.type == "tool":',
  '            first_line = m.text.split("\\n")[0]',
  '            console.print(f"   [grey50]{escape(first_line)}[/]")',
  '    return len(messages)'
];

window.ROOM = {
  id: 'coding-agent-cli',
  title: 'Lost in Orbit',
  session: 'Building Coding Agent using LangGraph · Part 3',
  tagline: 'The station’s agent only talks through notebook cells. Build its CLI and reach the escape pod.',
  story: [
    'Station log. Our Claude Code runs the whole station… but only through notebook cells.',
    'A solar storm hits. The power fails. The escape pod opens only from a terminal.',
    'Build the CLI. Reach the pod.'
  ],
  target: 20 * 60,
  lines: {
    dark: 'Emergency power is off. Something on the left wall glows green…',
    light: 'Power is back! A locker, a console, a drone… and a sealed escape pod. Start with the supply locker.',
    switchHint: 'Look for the green glow on the left wall. It’s the power lever.',
    tooDark: 'Too dark to see that. Find the power lever first.',
    switchOn: 'The power is on. Better leave the lever alone.'
  },

  /* animated "How to play" cards (shared/howto-cards.js) */
  howcards: [
    { art: 'dark', icon: '⚡', title: 'Restore power', cap: 'The station is dark. Find the *glowing power lever.*', ms: 4600 },
    { art: 'search', icon: '🔍', title: 'Tap an object', cap: 'Tap an object. Its lock has *2 questions.*', ms: 4800 },
    { art: 'answer', icon: '⭐', title: 'First try scores', cap: 'Right on the *first try* = ⭐ Wrong? Read the hint, try again.', ms: 5400 },
    { art: 'pickup', icon: '✋', title: 'Pick up the item', cap: 'The lock opens. *Tap the item.*', ms: 4600 },
    { art: 'use', icon: '🔧', title: 'Use the item', cap: 'Tap the item, then *where it fits.*', ms: 5000 },
    { art: 'escape', icon: '🚀', title: 'Reach the pod', cap: 'Open the *escape pod.* Beat your time and score!', ms: 4800 }
  ],

  zones: [
    { id: 'cli', goal: 'Why our agent needs a CLI', objs: ['locker', 'console'] },
    { id: 'rich', goal: 'Formatted output with rich', objs: ['crate', 'beacon'] },
    { id: 'show', goal: 'Tool call display: show_messages()', objs: ['vent', 'drone'] },
    { id: 'perm', goal: 'Permission prompt: ask_permission()', objs: ['hull', 'airlock'] },
    { id: 'chat', goal: 'The chat loop: chat()', objs: ['nav', 'door'] }
  ],

  items: {
    fuse: { name: 'power fuse', icon: '<rect x="8" y="2" width="8" height="20" rx="2"/><path d="M10 7l3 4h-2l3 5"/>' },
    keycard: { name: 'access card', icon: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5" y="8" width="5" height="4" rx="1"/><path d="M13 15h5"/>' },
    lens: { name: 'green lens', icon: '<circle cx="12" cy="12" r="8"/><path d="M8.5 9.5a4 4 0 0 1 3-2"/>' },
    wrench: { name: 'wrench', icon: '<path d="M14.5 6.5a4 4 0 0 0 5 5l-9.5 9.5a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/>' },
    chip: { name: 'drone chip', icon: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>' },
    cutter: { name: 'laser cutter', icon: '<rect x="2" y="9" width="13" height="6" rx="2"/><path d="M15 12h4M21 12h1"/><path d="M5 15v4h3v-4"/>' },
    plug: { name: 'override cable', icon: '<rect x="14" y="8" width="7" height="8" rx="1.5"/><path d="M21 10h2M21 14h2"/><path d="M14 12C8 12 10 20 2 20"/>' },
    navcart: { name: 'star-chart cartridge', icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="9" cy="12" r="3"/><path d="M14 10h4M14 14h3"/>' },
    podkey: { name: 'escape pod key', icon: '<circle cx="7" cy="7.5" r="4.5"/><path d="M10.2 10.7L20 20.5M15.5 16l2.3-2.3M18 18.5l2.3-2.3"/>' }
  },

  objects: [
    {
      id: 'locker', name: 'Supply locker', needs: null,
      hint: 'Start with the tall locker on the left. It has a padlock.',
      gives: 'fuse',
      clue: 'A power fuse! The main console is dead. Its fuse slot is empty.',
      q: [
        { t: 'pickmany', p: 'In the notebook, the agent fixed add.py with these 5 steps. Tap every step that our notebook output showed.',
          head: '`show(result)` after each `claude_code.invoke(...)` cell',
          items: [{ tag: 'ai', text: 'Calls `grep_search` to find the file' }, { tag: 'ai', text: 'Calls `read_file` on add.py' }, { tag: 'pause', text: 'Waits for approval before `edit_file`' }, { tag: 'pause', text: 'Waits for approval before `terminal`' }, { tag: 'ai', text: 'Fixed. add.py subtracted b instead of adding it.' }],
          a: [2, 3, 4],
          why: 'The output showed only the pauses and the final response. grep_search, read_file, edit_file and terminal ran unseen, so our CLI must show every tool call.', hint: 'Did `show(result)` ever print a tool that ran without a pause?' },
        { t: 'dial', code: '[1] result = claude_code.invoke({"messages": [...]}, config)\n[2] result = claude_code.invoke(Command(resume="yes"), config)',
          p: 'A new task pauses 3 times: before `edit_file`, then two `terminal` commands. How many notebook cells do we write for this one task?',
          values: [1, 2, 3, 4, 5, 6], a: 3, start: 0, unit: 'cells for one task',
          why: 'One cell starts the task, and every pause needs one more cell with `Command(resume=...)`: 1 + 3 = 4. Our chat loop will do this for us.', hint: 'One cell to start, plus one cell for each pause.' }
      ]
    },
    {
      id: 'console', name: 'Main console', needs: 'fuse', at: [874, 547], use: 'snap', useMs: 2400, act: 'The fuse clicks in. The screens flicker on…',
      locked: 'The main console is dead. Its fuse slot is empty.',
      hint: 'Select the power fuse, then tap the FUSE slot on the console.',
      gives: 'keycard',
      clue: 'The screens read: CARGO CRATE → ACCESS CARD. An access card pops out of the console.',
      q: [
        { t: 'terminal', p: 'The add.py task in our CLI. Drag in the lines it prints, in order.', title: 'python my_claude_code.py',
          lines: ['> Fix the bug in add.py.', '[[0]]', '[[1]]', '[[2]]', '[[3]]'],
          ans: ["🟢 grep_search {'pattern': 'Sum', 'output_mode': 'content'}", "🟢 read_file {'file_path': 'add.py'}", '╭─ Permission ─╮ edit_file add.py', 'Fixed. add.py subtracted b instead of adding it.'],
          tok: ["🟢 grep_search {'pattern': 'Sum', 'output_mode': 'content'}", "🟢 read_file {'file_path': 'add.py'}", '╭─ Permission ─╮ edit_file add.py', 'Fixed. add.py subtracted b instead of adding it.', 'Command(resume="yes")'],
          why: 'Every tool call shows up the moment it runs, the risky one stops for a Permission box, and we never type Command(resume=...) ourselves. That is what our CLI fixes.', hint: 'Find first, then read, then ask before changing, then the final response. Which line do we never type in our CLI?' },
        { t: 'match', p: 'Our CLI needs four parts. Wire each part to its job.',
          L: ['rich', 'show_messages()', 'ask_permission()', 'chat()'],
          R: ['Colours, boxes and input in the terminal', 'Prints each tool call and its result', 'Shows a box before a risky call', 'Reads our tasks, one after another'],
          why: 'Four parts, four jobs. Together they make our CLI.', hint: 'show_messages() prints. ask_permission() asks.' }
      ]
    },
    {
      id: 'crate', name: 'Cargo crate', needs: 'keycard', at: [1153, 776], use: 'card', useMs: 2000, act: 'Beep! The card reader turns green. The lid unlocks…',
      locked: 'A cargo crate stamped LIBRARIES. Its card reader blinks red.',
      hint: 'Swipe the access card on the crate’s card reader.',
      gives: 'lens',
      clue: 'Inside the crate: a green lens. The status beacon above the window has no lens.',
      q: [
        { t: 'swipe', p: 'Python has a few libraries for formatted output. Fling each card to TRUE or FALSE.',
          S: [['colorama and termcolor colour text, but they can’t draw a box.', true], ['curses works with simple print calls, one line after another.', false], ['rich draws a box with `Panel`.', true]],
          why: 'curses takes over the whole window. rich has colours, boxes and input.', hint: 'Which library takes over the whole terminal window?' },
        { t: 'typein', editor: true, loose: true, p: 'Create the one console we use for all our output. Type line 3.', title: 'my_claude_code.py',
          lines: ['from rich.console import Console', ''], ans: ['console = Console()'],
          why: '`console = Console()` creates the console. From now on we print with `console.print()`.', hint: 'The syntax is variable_name = ClassName(). The variable is console.' }
      ]
    },
    {
      id: 'beacon', name: 'Status beacon', needs: 'lens', at: [1140, 124], use: 'snap', useMs: 1800, act: 'The lens snaps on. The beacon lights up green!',
      locked: 'The status beacon. Its lens is missing.',
      hint: 'Put the green lens on the round beacon above the window, on the right.',
      gives: 'wrench',
      clue: 'The beacon spins green and a wrench drops from its bracket. The vent near the floor is bolted shut.',
      q: [
        { t: 'markup', p: 'Make the console print a tool call, like the GOAL. Build the markup.',
          tok: [':green_circle:', ':white_circle:', '[bold]', '[grey50]', 'read_file', '[/]', "{'file_path': 'add.py'}"],
          ans: [':green_circle:', '[bold]', 'read_file', '[/]', "{'file_path': 'add.py'}"],
          why: 'rich puts 🟢 for `:green_circle:`, and only the text before `[/]` is bold.', hint: 'Which piece makes the circle? Which starts bold, and which ends it?' },
        { t: 'cloze', p: 'What does each piece of rich markup do? Drag the words in.',
          text: ':green_circle: is an [[0]] code. [bold] starts a [[1]], and [[2]] ends it. grey50 is one of rich’s named [[3]].',
          ans: ['emoji', 'style', '[/]', 'colours'], tok: ['emoji', 'style', '[/]', 'colours', '[end]', 'comment', 'Panel'],
          why: 'Emoji codes go between colons, a style goes in square brackets, and `[/]` ends it.', hint: 'The tag that ends a style has a slash.' }
      ]
    },
    {
      id: 'vent', name: 'Floor vent', needs: 'wrench', at: [388, 598], use: 'screw', useMs: 2400, act: 'Unbolting… the bolts float away one by one.',
      locked: 'A vent hatch, bolted shut.',
      hint: 'Use the wrench on the bolted vent next to the locker.',
      gives: 'chip',
      clue: 'Behind the vent: a memory chip labelled DRONE. The repair drone on the floor near the pod is switched off.',
      q: [
        { t: 'pickmany', p: '`already_shown` is 2. Tap every message that `show_messages()` prints now.',
          head: '`show_messages(result["messages"], 2)`',
          items: [{ tag: 'human', text: 'Which file prints the sum?' }, { tag: 'ai', text: 'add.py prints the sum, on line 3.' }, { tag: 'human', text: 'Fix the bug in add.py.' }, { tag: 'ai', text: 'tool call: `read_file`' }, { tag: 'tool', text: 'a = 2' }, { tag: 'ai', text: 'Fixed. It now prints Sum: 5.' }],
          a: [3, 4, 5],
          why: '`messages[2:]` starts at index 2, but our own task is never printed. We typed it, so we already see it.', hint: 'Count from 0. Does show_messages() print a human message?' },
        { t: 'fill', p: 'Complete `show_messages()`.',
          code: SHOW_MESSAGES.join('\n').replace('m.type == "ai"', 'm.type == [[0]]').replace('m.tool_calls', 'm.[[1]]').replace('split("\\n")[0]', 'split("\\n")[[[2]]]'),
          ans: ['"ai"', 'tool_calls', '0'], tok: ['"ai"', '"human"', 'tool_calls', 'text', '0', '-1'],
          why: 'An AI message prints its text and its tool calls. A tool result prints only its first line.', hint: 'Index 0 is the first item of a list.' }
      ]
    },
    {
      id: 'drone', name: 'Repair drone', needs: 'chip', at: [1400, 727], use: 'chip', useMs: 2200, act: 'The chip slides in. The drone’s eyes blink on…',
      locked: 'A repair drone, switched off. The chip slot on its head is empty.',
      hint: 'Put the drone chip into the slot on top of the drone, on the floor near the pod.',
      gives: 'cutter',
      clue: 'The drone hovers up and drops a laser cutter. A hull panel by the airlock is welded shut.',
      q: [
        { t: 'bug', p: 'The LLM replied `[x] done`, but the screen shows only ` done`. Tap the buggy line.',
          code: SHOW_MESSAGES.join('\n').replace('{escape(m.text)}', '{m.text}'), line: 4,
          why: 'Without `escape()`, rich reads `[x]` as a style tag. `escape()` keeps square brackets as text.', hint: 'Which print forgot `escape()`?' },
        { t: 'dial', code: 'shown = show_messages(result["messages"], 0)', p: 'The run returned 4 messages. Turn the dial to what `show_messages()` returns.',
          values: [0, 1, 2, 3, 4, 5], a: 4, start: 1, unit: 'messages printed so far',
          why: '`return len(messages)` gives 4, so next time chat() starts printing at index 4.', hint: 'Read the last line of show_messages().' }
      ]
    },
    {
      id: 'hull', name: 'Hull panel', needs: 'cutter', at: [1062, 332], use: 'chip', useMs: 2600, act: 'Zzzt! The cutter traces the seam. The panel falls away…',
      locked: 'A hull panel, welded shut.',
      hint: 'Use the laser cutter on the SEALED panel between the window and the airlock.',
      gives: 'plug',
      clue: 'Behind the panel: a screen titled Permission, and an override cable. The airlock panel next to the pod has an empty socket.',
      q: [
        { t: 'fill', p: 'Complete the box part of `ask_permission()`.',
          code: 'def ask_permission(calls):\n    text = "\\n".join(f"{c[[[0]]]} {escape(str(c[\'args\']))}"\n                     for c in calls)\n    console.print([[1]](f"{text}\\n\\nDo you want to proceed?\\n"\n                        "1. Yes\\n2. Yes, and don\'t ask again\\n3. No",\n                        [[2]]="Permission"))',
          ans: ["'tool'", 'Panel', 'title'], tok: ["'tool'", "'name'", 'Panel', 'Console', 'title', 'border'],
          why: '`interrupt()` sends dicts with "tool" and "args". `Panel` draws the box, and `title` sits on the top border.', hint: 'human_review sends {"tool": ..., "args": ...} for each call.' },
        { t: 'flow', p: 'The graph pauses at human_review. How does our answer get back? Drag the parts into the flow.',
          nodes: ['interrupt() pauses the graph', '[[0]]', '[[1]]', '[[2]]'],
          ans: ['result["__interrupt__"][0].value', 'ask_permission() returns our answer', 'Command(resume=answer)'],
          tok: ['result["__interrupt__"][0].value', 'ask_permission() returns our answer', 'Command(resume=answer)', 'show_messages()', 'HumanMessage(content=task)'],
          why: 'chat() takes the risky calls from the paused result, asks us, and resumes the graph with our answer.', hint: 'First get the calls, then ask, then resume.' }
      ]
    },
    {
      id: 'airlock', name: 'Airlock panel', needs: 'plug', at: [1278, 450], use: 'plug', useMs: 2200, act: 'The cable plugs in. The airlock screen wakes up…',
      locked: 'The airlock control panel. Its override socket is empty.',
      hint: 'Plug the override cable into the round socket on the airlock panel, next to the pod.',
      gives: 'navcart',
      clue: 'ACCESS! A star-chart cartridge slides out. The navigation computer below needs it.',
      q: [
        { t: 'typein', p: 'The airlock asks before an edit. Make `ask_permission()` return "always". Type your choice.', title: 'python my_claude_code.py',
          panel: { title: 'Permission', body: "edit_file {'file_path': 'add.py', 'old_text': 'a - b', 'new_text': 'a + b'}\n\nDo you want to proceed?\n1. Yes\n2. Yes, and don't ask again\n3. No" },
          prompt: 'Choose 1, 2, or 3: ', ans: ['2'], out: '→ ask_permission() returns "always"',
          why: '"2" means yes, and don’t ask again, so it returns "always".', hint: 'Which choice says don’t ask again?' },
        { t: 'dragto', code: 'choice = console.input("Choose 1, 2, or 3: ")\nif choice == "1":\n    return "yes"\nif choice == "2":\n    return "always"\nreturn "no"',
          p: 'We type 4. Drag it to what `ask_permission()` returns.', icon: '⌨️', item: 'We type `4`',
          targets: ['"yes"', '"always"', '"no"', 'An error'], a: 2,
          why: 'Anything else counts as no, the safe answer.', hint: '`console.input()` returns text. Is "4" equal to "1" or "2"?' }
      ]
    },
    {
      id: 'nav', name: 'Navigation computer', needs: 'navcart', at: [1255, 620], use: 'tape', useMs: 2400, act: 'The cartridge slides in. The star map spins up…',
      locked: 'The navigation computer. Its cartridge slot is empty.',
      hint: 'Put the star-chart cartridge into the slot of the navigation computer.',
      gives: 'podkey',
      clue: 'Course set! The computer ejects the escape pod key. Use it on the pod hatch.',
      q: [
        { t: 'order', p: 'We call `chat()`. Put the steps of one turn in order.',
          o: ['Show the welcome box', 'Read our task after the >', 'If the task is /exit, break', 'Run the graph with the task', 'Print only the new messages'],
          why: 'Welcome, read, check /exit, run, show. Then the loop reads the next task.', hint: 'We can’t run the graph before we read the task.' },
        { t: 'spot', p: 'Tap the part that lets the agent remember our earlier tasks.',
          code: 'def chat():\n    console.print(⟦Panel.fit("Welcome to our Claude Code!\\nType /exit to quit.")⟧)\n    config = ⟦{"configurable": {"thread_id": "1"}}⟧\n    ⟦shown = 0⟧\n    while True:\n        task = ⟦console.input("\\n[bold]>[/] ")⟧',
          a: 1,
          why: 'The same thread_id for every task, so the checkpointer keeps one conversation.', hint: 'Which part keeps one conversation for every task?' }
      ]
    },
    {
      id: 'door', name: 'Escape pod hatch', needs: 'podkey', at: [1367, 432], use: 'key', useMs: 1800, act: 'The key turns. The pod asks two last questions…',
      locked: 'The escape pod hatch. Locked tight.',
      hint: 'Use the escape pod key on the keyhole of the pod hatch.',
      gives: null,
      q: [
        { t: 'terminal', p: 'Our loop has no interrupt check yet. The LLM asks for edit_file. What does the screen show next? Drag it in.', title: 'python my_claude_code.py',
          lines: ['> Fix the bug in add.py.', "🟢 edit_file {'file_path': 'add.py', 'old_text': ...}", '[[0]]'],
          ans: ['>'], tok: ['>', 'Updated add.py.', 'Permission box', 'Sum: 5'],
          why: 'Nobody looks at `__interrupt__`, so the loop goes back to the > and the agent is stuck.', hint: 'Does our loop look at result["__interrupt__"] yet?' },
        { t: 'fill', p: 'Last lock! Handle the pauses in the chat loop.',
          code: 'result = claude_code.invoke({"messages": [HumanMessage(content=task)]}, config)\nshown = show_messages(result["messages"], shown)\nwhile [[0]] in result:\n    answer = ask_permission(result["__interrupt__"][0].value)\n    result = claude_code.invoke([[1]](resume=answer), config)\n    shown = [[2]](result["messages"], shown)',
          ans: ['"__interrupt__"', 'Command', 'show_messages'], tok: ['"__interrupt__"', 'Command', 'show_messages', '"messages"', 'HumanMessage', 'ask_permission'],
          why: 'One task can pause many times. While the graph waits, we ask, resume with `Command`, and print what it did.', hint: 'The loop runs while the paused result has the __interrupt__ key.' }
      ]
    }
  ],

  decor: {
    window: 'Earth, far below. Beautiful, but no clues out there.',
    clock: 'Mission clock. The storm hit three hours ago.',
    patch: 'The station’s mission patch: ORBIT CLI.',
    mug: 'Cold coffee, stuck to the desk with velcro.',
    plant: 'Space basil in a grow tube. It floats a little.',
    helmet: 'A spare helmet. Nobody needs it… yet.'
  }
};
