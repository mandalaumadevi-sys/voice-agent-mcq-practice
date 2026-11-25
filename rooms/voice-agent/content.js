/* The Recording Studio — escape room for the "Building a Voice Agent" session.
   Every question comes from final-code/part_4_final.py and the session deck.
   Each lock asks 1–2 questions. Object fields:
     needs  item that must be used on it first (null = opens once the previous lock is solved)
     at     [x, y] in the scene where the item flies to
     use    sound + animation name, useMs = how long the "item works" animation runs
     gives  item found inside (null = only a clue), keep = the used item stays in the inventory */

const RECORD_VOICE = [
  'def record_voice():',
  '    chunks = []',
  '',
  '    def save_chunk(indata, frames, time, status):',
  '        chunks.append(indata.copy())',
  '',
  '    with sd.InputStream(samplerate=16000, channels=1, callback=save_chunk):',
  '        console.input("[bold red]● Recording[/] Press Enter to stop ")',
  '    sf.write("voice.wav", np.concatenate(chunks), 16000)',
  '    return "voice.wav"'
];

window.ROOM = {
  id: 'voice-agent',
  title: 'The Recording Studio',
  session: 'Building a Voice Agent',
  story: [
    '11:58 PM. You stayed late in the studio to give your Claude Code a voice.',
    'The door clicks shut behind you. The lights die.',
    'Find a way out.'
  ],
  tagline: 'Locked in for the night. Solve your way out.',
  target: 20 * 60,

  /* intro clip (tools/record-how-to-play.js): lock 1, the item, the clue, then the last key and the door; t = seconds */
  howto: {
    video: 'how-to-play.webm',
    steps: [
      { t: 0, icon: '🔦', title: 'Find the light', cap: 'It’s dark. Find the *glowing switch.*' },
      { t: 5.8, icon: '👆', title: 'Tap & solve', cap: 'Tap an object. *Drag the answer in.*' },
      { t: 14.1, icon: '⭐', title: 'First try scores', cap: 'Right on the *first try* = ⭐' },
      { t: 25.5, icon: '✋', title: 'Pick it up', cap: 'The lock opens. *Tap the item.*' },
      { t: 29.6, icon: '📜', title: 'Read the clue', cap: 'The *clue* tells you where to go.' },
      { t: 34.3, icon: '🧩', title: 'Use it', cap: 'Tap the item, then *where it fits.*' },
      { t: 40, icon: '🗝️', title: 'Last key', cap: '10 locks later… the *door key!*' },
      { t: 52.3, icon: '🚪', title: 'Escape!', cap: 'The door opens. *You’re out!*' }
    ]
  },

  zones: [
    { id: 'intro', goal: 'Voice dictation and commands', objs: ['drawer', 'laptop'] },
    { id: 'record', goal: 'Record the voice and save voice.wav', objs: ['case', 'mic', 'deck', 'enter', 'speakers'] },
    { id: 'stt', goal: 'Speech-to-text with AssemblyAI', objs: ['poster', 'transcriber'] },
    { id: 'voice', goal: 'The /voice command in chat()', objs: ['mixer', 'door'] }
  ],

  items: {
    charger: { name: 'laptop charger', icon: '<path d="M8 2v5M12 2v5"/><rect x="6" y="7" width="8" height="6" rx="1.5"/><path d="M10 13v3a4 4 0 0 0 4 4h6"/>' },
    brasskey: { name: 'small brass key', icon: '<circle cx="7" cy="12" r="4"/><path d="M11 12h10M17 12v3M20 12v2"/>' },
    xlr: { name: 'XLR cable', icon: '<circle cx="7" cy="7" r="4.5"/><path d="M5.5 6h.01M8.5 6h.01M7 8.6h.01"/><path d="M10.5 10.5c3 3 1 9.5 7.5 9.5h3"/>' },
    blank: { name: 'blank tape', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><circle cx="16" cy="12" r="2.2"/>' },
    keycap: { name: 'ENTER keycap', icon: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M15 10v3H8M10 11l-2 2 2 2"/>' },
    tape: { name: 'voice.wav tape', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/><circle cx="16" cy="11" r="2.2"/><path d="M6 19l2-3.5h8l2 3.5"/>' },
    screwdriver: { name: 'screwdriver', icon: '<path d="M15 3l6 6-3 3-6-6z"/><path d="M12 9l-8 8-1 4 4-1 8-8"/>' },
    keycard: { name: 'API key card', icon: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19M6 15h5"/>' },
    transcript: { name: 'transcript strip', icon: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>' },
    doorkey: { name: 'door key', icon: '<circle cx="7" cy="7.5" r="4.5"/><path d="M10.2 10.7L20 20.5M15.5 16l2.3-2.3M18 18.5l2.3-2.3"/>' }
  },

  objects: [
    {
      id: 'drawer', name: 'Desk drawer', needs: null,
      hint: 'Start with the desk. Its drawer has a padlock.',
      gives: 'charger',
      clue: 'A laptop charger. The laptop on the desk is dead. Plug it in.',
      q: [
        { t: 'cloze', p: 'What is voice dictation in Claude Code? Drag the words in.',
          text: 'We [[0]], and our [[1]] appear in the [[2]] as text.',
          ans: ['speak', 'words', 'prompt'], tok: ['speak', 'words', 'prompt', 'type', 'audio file', 'final response'],
          why: 'Dictation: we speak, and the computer types our words for us.', hint: 'Think of someone typing what you say, right where you type.' },
        { t: 'terminal', p: 'Turn on voice dictation in Claude Code. Drag the command into the prompt.', title: 'claude',
          lines: ['> [[0]]'], ans: ['/voice'], tok: ['/voice', '/help', '/clear', '/exit'],
          out: '🎙  Voice dictation is on. Speak, and your words appear here.',
          why: '`/voice` is a command, so the CLI runs it itself.', hint: 'The command is named after what it turns on.' }
      ]
    },
    {
      id: 'laptop', name: 'Laptop', needs: 'charger', at: [140, 470], use: 'plug', useMs: 2600, act: 'Plugged in. The battery charges and the laptop boots…',
      locked: 'The laptop is dead. The battery is empty.',
      hint: 'Select the charger in your inventory, then tap the laptop.',
      gives: 'brasskey',
      clue: 'Taped under the laptop: a small brass key, stamped FLIGHT CASE.',
      q: [
        { t: 'sort', p: 'Where does each input go in our CLI?',
          B: ['The LLM gets it as a task', 'Our chat loop handles it'],
          items: [['/voice', 1], ['/exit', 1], ['Fix the bug in add.py', 0], ['The words speech_to_text() returns', 0]],
          why: 'A command is for the CLI app. The text that `/voice` produces becomes a task.', hint: 'The LLM never sees the commands. What about the text they produce?' },
        { t: 'swipe', p: 'We added voice to our agent. Fling each card to TRUE or FALSE.',
          S: [['The LLM, the tools and the permission prompts stay the same.', true], ['A risky tool call from a voice task runs without asking.', false], ['`/voice` itself is sent to the LLM.', false]],
          why: 'Voice only changes how we give the task.', hint: 'Did any node of our graph change in this session?' }
      ]
    },
    {
      id: 'case', name: 'Flight case', needs: 'brasskey', at: [1010, 755], use: 'key', useMs: 2200, act: 'The key turns. Click! The lid opens…',
      locked: 'A heavy flight case. Its brass lock won’t move.',
      hint: 'The brass key is stamped FLIGHT CASE. It’s on the floor.',
      gives: 'xlr',
      clue: 'An XLR cable. The microphone by the door is unplugged.',
      q: [
        { t: 'swipe', p: 'Why do we run Claude Code on our own laptop? Fling each card to TRUE or FALSE.',
          S: [['A recording library opens the microphone of the computer that runs the code.', true], ['A web IDE server can record from the microphone on our laptop.', false], ['So we run `python my_claude_code.py` on our own laptop.', true]],
          why: 'Our code and our microphone must be on the same computer.', hint: 'Where does the code run, and where is the microphone?' },
        { t: 'match', p: 'Wire each package to its job.',
          L: ['sounddevice', 'numpy', 'soundfile', 'assemblyai'],
          R: ['Reads sound from the microphone', 'Joins the blocks into one array', 'Saves the samples as voice.wav', 'Turns the audio file into text'],
          why: 'Four packages, four jobs.', hint: 'sounddevice doesn’t save files.' }
      ]
    },
    {
      id: 'mic', name: 'Microphone', needs: 'xlr', at: [702, 470], use: 'plug', useMs: 2000, act: 'Plugged in. The red light comes on. The mic is live!',
      locked: 'The mic is dead. Its cable is missing.',
      hint: 'Plug the XLR cable into the microphone near the door.',
      gives: 'blank',
      clue: 'The mic is live. A blank tape was clipped to the stand. The tape deck on the shelf can record.',
      q: [
        { t: 'cloze', p: 'How does a microphone turn sound into numbers? Drag the words in.',
          text: 'It measures the sound wave thousands of times a [[0]]. Each measurement is one [[1]], so a recording is a long list of [[2]].',
          ans: ['second', 'sample', 'samples'], tok: ['second', 'sample', 'samples', 'minute', 'token', 'callback'],
          why: 'A recording is a long list of samples.', hint: 'Look for this word inside `samplerate`.' },
        { t: 'dial', code: 'sd.InputStream(samplerate=?, channels=1, callback=save_chunk)', p: 'Set the studio dial to the sample rate our recording uses.',
          values: [8000, 16000, 22050, 44100, 48000], a: 1, start: 3, unit: 'samples every second',
          why: '`samplerate=16000`: we take 16000 samples every second.', hint: 'It is the number we also pass to `sf.write()`.' }
      ]
    },
    {
      id: 'deck', name: 'Tape deck', needs: 'blank', at: [1128, 312], use: 'tape', useMs: 2000, act: 'The tape slides in. REC… it’s recording.',
      locked: 'An empty tape deck. It needs a tape to record on.',
      hint: 'Put the blank tape into the deck on the shelf.',
      gives: 'keycap',
      clue: 'REC! The deck records your voice… and it won’t stop. Its drawer pops out an ENTER keycap. The big key on the desk is missing its cap.',
      q: [
        { t: 'fill', p: 'Complete `record_voice()` so it records.',
          code: ['def record_voice():', '    chunks = []', '', '    def save_chunk(indata, frames, time, status):', '        chunks.[[0]](indata.copy())', '', '    with sd.[[1]](samplerate=16000, channels=1, callback=[[2]]):', '        console.input("[bold red]● Recording[/] Press Enter to stop ")'].join('\n'),
          ans: ['append', 'InputStream', 'save_chunk'], tok: ['append', 'InputStream', 'save_chunk', 'OutputStream', 'record_voice', 'insert'],
          why: 'The stream calls `save_chunk` for each block, and it saves a copy in `chunks`.', hint: 'The callback is the function written just above the stream.' },
        { t: 'flow', p: 'Every block of sound takes this path. Drag the parts into the flow.',
          nodes: ['🎙 Microphone', '[[0]]', '[[1]]', '[[2]]'],
          ans: ['sounddevice reads a block', 'save_chunk() — our callback', 'chunks list'],
          tok: ['sounddevice reads a block', 'save_chunk() — our callback', 'chunks list', 'soundfile saves it', 'speech_to_text()'],
          why: 'sounddevice calls our callback, `save_chunk`, for each block, and it saves a copy in `chunks`.', hint: 'A callback is our function that the library calls for each block.' }
      ]
    },
    {
      id: 'enter', name: 'Big ENTER key', needs: 'keycap', at: [484, 512], use: 'snap', useMs: 1300, act: 'Snap! The cap clicks onto the ENTER key.', from: '.ejtape',
      locked: 'A big ENTER key with its cap missing.',
      hint: 'Put the ENTER keycap on the big key on the desk.',
      gives: 'tape',
      clue: 'Clunk. The reels stop and the deck pushes out the tape: voice.wav. Play it.',
      q: [
        { t: 'spot', p: 'Tap the part of the code that keeps us recording until we press Enter.',
          code: 'with {{sd.InputStream(samplerate=16000, channels=1, callback=save_chunk)}}:\n    {{console.input("[bold red]● Recording[/] Press Enter to stop ")}}\n{{sf.write("voice.wav", np.concatenate(chunks), 16000)}}', a: 1,
          why: '`console.input()` waits for Enter; then the `with` block ends and the stream closes.', hint: 'Which part is waiting for a key press?' }
      ]
    },
    {
      id: 'speakers', name: 'Studio speakers', needs: 'tape', keep: true, at: [1041, 535], use: 'chip', useMs: 2200, act: 'The tape plays… way too fast!',
      locked: 'Studio speakers. Silent, with nothing to play.',
      hint: 'Play the voice.wav tape on the speakers.',
      gives: 'screwdriver',
      clue: 'Your voice plays clearly now: “…the key is behind the poster…” A screwdriver was taped under the speaker.',
      q: [
        { t: 'bug', p: 'Our voice plays far too fast. Tap the buggy line.',
          code: RECORD_VOICE.join('\n').replace('np.concatenate(chunks), 16000', 'np.concatenate(chunks), 44100'), line: 8,
          why: 'The file must use the rate we recorded with, 16000.', hint: 'Compare the numbers in two of the lines.' },
        { t: 'swipe', p: 'Saving the recording. Fling each card to TRUE or FALSE.',
          S: [['sounddevice saves voice.wav for us.', false], ['`np.concatenate(chunks)` joins the list of blocks into one array.', true], ['`record_voice()` returns the file name, voice.wav.', true]],
          why: 'soundfile saves the file, numpy joins the blocks, and we return "voice.wav".', hint: 'sounddevice only reads the microphone.' }
      ]
    },
    {
      id: 'poster', name: 'Poster', needs: 'screwdriver', at: [400, 126], use: 'screw', useMs: 2400, act: 'Unscrewing… the screws drop one by one.', from: '.hidcard',
      locked: 'The poster frame is screwed to the wall.',
      hint: 'The tape said: behind the poster. Use the screwdriver on it.',
      gives: 'keycard',
      clue: 'Behind the poster: a key card printed API KEY. The Transcriber has a KEY CARD slot and an AUDIO IN slot.',
      q: [
        { t: 'flow', p: 'How does our key reach AssemblyAI? Drag the parts into the flow.',
          nodes: ['.env file', '[[0]]', '[[1]]', 'aai.settings.api_key'],
          ans: ['load_dotenv()', 'os.getenv("ASSEMBLYAI_API_KEY")'], tok: ['load_dotenv()', 'os.getenv("ASSEMBLYAI_API_KEY")', 'console.input()', 'the checkpointer'],
          why: '`load_dotenv()` reads .env, and `os.getenv()` gets the key.', hint: 'First the file is read, then one value is taken from it.' },
        { t: 'dragto', code: 'Failed to upload audio file, Invalid API key', p: 'Our test stops with this error. Drag the fix to the place that needs it.',
          icon: '🔧', item: 'The fix',
          targets: ['ASSEMBLYAI_API_KEY in `.env`', 'Windows microphone settings', '`samplerate` in record_voice()', '`thread_id` in config'], a: 0,
          why: 'With a wrong key, AssemblyAI rejects the upload.', hint: 'Read the last three words of the error.' }
      ]
    },
    {
      id: 'transcriber', name: 'Transcriber', needs: ['keycard', 'tape'], from: '.strip',
      uses: {
        keycard: { at: [1459, 330], use: 'card', useMs: 1800, act: 'The card slides in. ONLINE! Now it wants your audio.' },
        tape: { at: [1459, 436], use: 'tape', useMs: 2600, act: 'The tape slides in. Transcribing…' }
      },
      locked: 'The Transcriber is offline. It needs a key card and some audio.',
      more: 'Online. Now feed it the voice.wav tape.',
      hint: 'Use the key card, then the voice.wav tape, on the Transcriber.',
      gives: 'transcript',
      clue: 'The Transcriber prints a strip: your words as text. The mixing desk has a TEXT IN slot.',
      q: [
        { t: 'fill', p: 'Complete `speech_to_text()`.',
          code: 'def speech_to_text(audio_path):\n    transcript = aai.[[0]]().[[1]](audio_path)\n    return transcript.[[2]]',
          ans: ['Transcriber', 'transcribe', 'text'], tok: ['Transcriber', 'transcribe', 'text', 'Recorder', 'upload', 'content'],
          why: 'One call uploads the file and waits for the text.', hint: 'The class name starts with a capital letter.' },
        { t: 'terminal', p: 'We said “add.py prints the wrong sum.” What does this line give back? Drag it into the output.', title: 'python',
          lines: ['>>> speech_to_text(record_voice())', '[[0]]'],
          ans: ["'add.py prints the wrong sum.'"], tok: ["'add.py prints the wrong sum.'", "'voice.wav'", '[array([[0.01], ...]), ...]', "AIMessage(content='...')"],
          why: '`transcript.text` holds the words as one string.', hint: 'record_voice() gives a file. What does speech_to_text() turn it into?' }
      ]
    },
    {
      id: 'mixer', name: 'Mixing desk', needs: 'transcript', at: [1076, 604], use: 'paper', useMs: 2200, act: 'The strip feeds in. The faders start to move…',
      locked: 'A safe under the faders. Its screen reads FEED ME TEXT.',
      hint: 'Feed the transcript strip into the TEXT IN slot of the mixing desk.',
      gives: 'doorkey',
      clue: 'The safe swings open: the door key! Use it on the exit door.',
      q: [
        { t: 'fill', p: 'Add the voice command to `chat()`.',
          code: 'if task == "/exit":\n    break\nif task == [[0]]:\n    task = [[1]]([[2]]())\n    console.print(f"[bold]You said:[/] {escape(task)}")',
          ans: ['"/voice"', 'speech_to_text', 'record_voice'], tok: ['"/voice"', 'speech_to_text', 'record_voice', '"voice.wav"', '"/exit"', 'chat'],
          why: 'Record first, then turn the recording into text.', hint: 'The inner call runs first: what must happen before speech-to-text?' },
        { t: 'order', p: 'We type /voice. Put the steps in order.',
          o: ['Our loop sees `/voice` and calls `record_voice()`', 'We speak, press Enter, and voice.wav is saved', '`speech_to_text()` sends voice.wav to AssemblyAI', 'The loop prints the text after You said', 'The agent runs the text as a normal task'],
          why: 'Record, transcribe, show, then run it like a typed task.', hint: 'Nothing can be transcribed before it is recorded.' }
      ]
    },
    {
      id: 'door', name: 'Exit door', needs: 'doorkey', at: [867, 468], use: 'key', useMs: 1800, act: 'The key turns. One last lock…',
      locked: 'Locked tight. It needs a heavy key.',
      hint: 'Use the door key on the door.',
      gives: null,
      q: [
        { t: 'dragto', p: 'Last lock. We type `/Voice` with a capital V. Drag it to where it goes.',
          icon: '💬', item: '`/Voice`',
          targets: ['Our chat loop runs it as the voice command', 'The LLM gets it as a normal task', 'Python raises an error'], a: 1,
          why: 'The check `task == "/voice"` must match exactly.', hint: 'Is "/Voice" == "/voice" in Python?' }
      ]
    }
  ],


  decor: {
    lamp: 'A warm desk lamp. Nice, but no clues here.',
    clock: '11:58 PM. Tick… tock.',
    plant: 'Just a plant. Someone forgot to water it.',
    foam: 'Acoustic foam. It eats echoes, not clues.',
    records: 'Old vinyl records. Great taste, no clues.'
  }
};
