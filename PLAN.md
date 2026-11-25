# Escape Rooms — Sem 4 Practice (Plan)

Reference: `reference/escape room.webp` (Escape Game 50 Rooms style: one detailed room, tap objects, collect items, last item opens the door).
We copy the **mechanics only**. Rooms, art and story are our own.

## 1. The core loop

```
Look around the room  →  tap an object  →  it is locked  →  answer a session question
      ↑                                                             │
      │                                     correct → object opens, gives an ITEM
      │                                                             │
      └────────── the ITEM is needed to open the NEXT object ◀──────┘
                         ...the last item is the KEY → door opens → ESCAPED
```

- Students **search**: objects are hotspots in the room scene. A soft glint shows only on objects they can open now.
- Every object has a lock that matches the question type (padlock = fill the code, dial safe = order the lines, wire box = match pairs, etc.).
- An **inventory bar** at the bottom holds found items. Students drag (or tap) an item onto an object to use it. Wrong item → the object shakes and says why.
- Each solved object also gives a **one-line clue** (written on a note, a screen, a tape) that points to the next object. No "go to X" arrows.
- Linear chain inside each wall, so nobody gets stuck: dependency graph has no loops.

## 2. Score and timer (as asked)

| Rule | Behaviour |
|---|---|
| Timer | Starts on "Enter the room", stops when the door opens. Shown top right as a ticking clock. |
| First try counts | A question scores **only if the first answer is correct**. |
| Retry until correct | Wrong answer → short "why" line, try again. The object opens only when correct, but no points. |
| Score | First-try correct count out of 20, shown as `17 / 20`, plus accuracy %. |
| Rank | 20 = Master Escapist, 17–19 = Escape Artist, 13–16 = Lock Picker, below = Rookie. Time shown beside it, not mixed into the score. |
| Escape screen | Door swings open, light floods in, confetti. Big time (`08:42`), score, rank, skills unlocked (one per learning outcome), "questions to revisit" list (the ones missed on first try). |
| Saved | Best time + best score in `localStorage` per room (wrapped in try/catch). |

No hints that give the answer. One optional "Look closer" per object that highlights the relevant code line (does not reduce the score, so students stay calm).

## 3. Thrill layer

- Opening: dark room, flicker of light, a voice-mail style intro line ("You've 15 minutes before the studio locks for the night…"). Tap to switch the light on.
- Ticking clock, heartbeat sound in the last 2 minutes (target time, not a hard fail; the room never locks them out).
- Every unlock: click sound, item flies into the inventory with a glow.
- Room changes as you solve: screens turn on, lights come back, a red LED on the door turns green one segment per wall.
- Final door: key turns, door opens with a light burst, then the results.
- Sound toggle top right (off by default inside class labs).

## 4. Room 1 — Voice Agent session ("The Recording Studio")

Theme maps onto the session: a sound studio where our Claude Code waits for a voice command.
Built chain (follows the deck: intro → Step 1 record → Step 2 speech-to-text → Step 3 /voice):
dark room → light switch → drawer (2) → laptop (3) → flight case (3) → microphone (3) → tape deck (2) → poster (1) → Transcriber (3) → mixing desk (3) → door key + keypad **3143** = **20 questions**.
Keypad digits: ① steps in our plan (3) · ② channels we record (1) · ③ packages this session adds to pip install (4) · ④ lines this session adds to chat() (3).

Original planning table:

| Wall / object | Learning outcome | Example questions (all from `final-code/part_4_final.py` + the Part 4 deck) | Item you get |
|---|---|---|---|
| 1. Laptop on the desk | Why voice + run Claude Code locally | Why can't the web IDE record our voice? · which line reads the key from `.env` · which packages Part 4 adds (sort) | **USB mic** |
| 2. Mic stand + mixer | Record the voice | `sd.InputStream(samplerate=16000, channels=1, callback=save_chunk)` — fill the blanks · what the callback does with each block · what stops the recording (Enter) · order the lines of `record_voice()` | **Tape cassette** |
| 3. Tape deck + shelf | Save as WAV | `sf.write("voice.wav", np.concatenate(chunks), 16000)` — find the bug · why `np.concatenate` · match function → job | **Transcript card** |
| 4. Control-room safe | Speech-to-text with AssemblyAI + `/voice` in the chat loop | `aai.Transcriber().transcribe(audio_path)` · what `transcript.text` returns · trace `task = speech_to_text(record_voice())` · predict the output | **Door KEY** |

Question types mixed (not mostly MCQ): fill the code, order the lines, find the bug, match, true/false, predict the output, sort, pick the line in code. Every code question shows the code.

Final lock: door keypad. The 4-digit code is built from one digit found on each wall's note (e.g. the `channels` value, the sample rate's first digit…), so students must have read the clues, not just answered.

## 5. Look

- One room scene, drawn as layered SVG/CSS (walls, desk, shelves, props) with soft lighting and a parallax tilt on mouse move. Original art, inspired by the warm wood + lamp light of the reference.
- Each session room gets its own set but the same engine, HUD, sounds and escape screen (one visual system).
- Fits one view at 1280×800 and 1366×768: room on the left, question panel slides in from the right next to the object, no scrolling.
- Minimal text: one-line prompts, short "why" lines.

## 6. Files (built)

```
escape rooms/
  PLAN.md
  reference/escape room.webp
  shared/
    engine.js        room loop, hotspots, inventory, timer, first-try scoring, keypad, escape screen, synthesised sounds
    questions.js     question renderers: choice, tf, sort, match, fill, bug, order
    room.css
  rooms/
    voice-agent/
      index.html     open this file in a browser
      content.js     zones, 8 locked objects, items, clues, keypad digits, 20 questions
      scene.js       the studio, drawn as SVG
```

New room = copy `rooms/voice-agent/`, redraw `scene.js` (same `data-obj` ids as in content.js), rewrite `content.js`.

Next sessions reuse the engine with a new `content.js` + scene (e.g. Data Ingestion = "The Archive Room", Advanced Chunking = "The Paper Shredder Room").

## 7. Build steps

1. Engine with a placeholder room: hotspots, inventory, lock panel, timer, scoring rules, escape screen.
2. Studio scene art + sounds.
3. Write the 20 Voice Agent questions from `part_4_final.py` and the Part 4 deck; verify each one against the code.
4. Test in a browser at 1280×800 and 1366×768: full play-through, first-try scoring, retry flow, no scrolling.
5. Your review → then template it for the next sessions.

## 8. Open points

- The Part 4 TR doc is still the old version (Whisper + hold Space). Questions will follow the **final code and deck** (AssemblyAI, record until Enter).
- `gamified-practice/` already has a treasure-map practice engine (and an older escape-room skin). This new folder is separate; decide later which one stays as "the" practice format.

## 9. Room 2 — Building Coding Agent Part 3 ("Lost in Orbit", built 2026-11-25)

`rooms/coding-agent-cli/` — a space-station command deck. The station's agent only talks through notebook cells; students build its CLI to reach the escape pod.
Chain (5 zones = 5 LEDs over the pod, in deck order): power lever → supply locker → main console (fuse) → cargo crate (access card) → status beacon (lens) → floor vent (wrench) → repair drone (chip) → hull panel (laser cutter) → airlock panel (override cable) → navigation computer (star-chart cartridge) → escape pod hatch (pod key) = **20 questions, 2 per lock**.
Questions follow the finalized Part 3 deck and `final-code/part_3_final.py`, 14 types: swipe, cloze, terminal, match (wiring), typein, markup, pickmany, fill, bug, dial, flow, dragto, order, spot.
New shared pieces (any room can use them):
- `shared/questions-extra.js` + `shared/extras.css`: **markup** (build a rich markup string, live terminal preview next to the goal), **typein** (type into a live terminal / editor line), **pickmany** (tap every card that fits), and `spot` with ⟦…⟧ markers so code with `{}` works.
- `shared/howto-cards.js`: "How to play" as 6 animated cards (no video). A room opts in with `ROOM.howcards` and no `ROOM.howto`.
- `ROOM.lines` overrides the engine's dark/light/switch lines.
