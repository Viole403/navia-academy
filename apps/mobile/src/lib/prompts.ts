/**
 * Practice prompts, in the learner's language.
 *
 * This is content, not interface copy, which is why it lives here rather than in
 * the locale files: the interface is Indonesian-first with English canonical,
 * but a Chinese learner's writing prompt has to be *in Chinese* — the exercise is
 * to compose in the target language, so an English prompt does not merely look
 * foreign, it asks for the wrong work and then judges it against a rubric written
 * for that prompt.
 *
 * Speaking prompts are the same set in the same order, phrased as something to
 * say rather than something to write, because "describe" and "say" train
 * different things even about the same subject.
 *
 * The `en` entry is the fallback so a language added to the CDN without a
 * translation here still gets usable practice instead of a blank screen.
 */

export type PromptSet = readonly string[]

const EN: { writing: PromptSet; speaking: PromptSet } = {
  writing: [
    "Write three sentences about your morning routine.",
    "Describe your hometown to someone who has never been there.",
    "Write about a goal you want to reach this year and why.",
    "Describe a meal you cooked or ate recently, step by step.",
    "Write a short message inviting a friend to study together.",
  ],
  speaking: [
    "Describe what you did yesterday in three sentences.",
    "Introduce yourself: name, where you live, what you do.",
    "Describe your favorite food and why you like it.",
    "Talk about your plans for next weekend.",
    "Describe the weather today and what you wear for it.",
  ],
}

const ZH: { writing: PromptSet; speaking: PromptSet } = {
  writing: [
    "用三句话描述你今天早上做了什么。",
    "向一位从未来过的人介绍你的家乡。",
    "写下你今年想达成的目标，以及为什么。",
    "一步一步地描述你最近做或吃的一道菜。",
    "写一条短消息，邀请朋友一起学习。",
  ],
  speaking: [
    "用三句话说说昨天做了什么。",
    "自我介绍：名字、住在哪里、做什么。",
    "描述你最喜欢的食物，以及你喜欢它的原因。",
    "说说你下周末有什么计划。",
    "描述今天的天气，以及你为此穿了什么。",
  ],
}

const JA: { writing: PromptSet; speaking: PromptSet } = {
  writing: [
    "今朝したことを、三文で書いてみましょう。",
    "一度も来たことがない人に、あなたの故郷を紹介してください。",
    "今年達成したい目標と、その理由を書いてみましょう。",
    "最近作った料理（または食べた料理）を、手順どおりに書きましょう。",
    "一緒に勉強しようと誘う、短いメッセージを書いてみましょう。",
  ],
  speaking: [
    "昨日やったことを三文で話してみましょう。",
    "自己紹介しましょう。名前、住んでいる場所、仕事。",
    "一番好きな食べ物と、その好きになった理由を話しましょう。",
    "来週末の予定を話してみましょう。",
    "今日の天気と、それに合わせた服装を話しましょう。",
  ],
}

const DE: { writing: PromptSet; speaking: PromptSet } = {
  writing: [
    "Schreibe drei Sätze über deinen Morgen.",
    "Beschreibe deine Heimatstadt für jemanden, der sie noch nie gesehen hat.",
    "Schreibe über ein Ziel, das du dieses Jahr erreichen willst — und warum.",
    "Beschreibe Schritt für Schritt etwas, das du gekocht oder gegessen hast.",
    "Schreibe eine kurze Nachricht, in der du jemanden zum gemeinsamen Lernen einlädst.",
  ],
  speaking: [
    "Erzähle in drei Sätzen, was du gestern gemacht hast.",
    "Stelle dich vor: Name, Wohnort, Beruf.",
    "Beschreibe dein Lieblingsessen und warum du es magst.",
    "Erzähle von deinen Plänen für das nächste Wochenende.",
    "Beschreibe das Wetter heute und was du daraus ziehst.",
  ],
}

const SETS: Record<string, { writing: PromptSet; speaking: PromptSet }> = {
  zh: ZH,
  ja: JA,
  de: DE,
  en: EN,
}

/** Writing prompts for a content language, falling back to English. */
export function writingPrompts(language: string): PromptSet {
  return (SETS[language] ?? EN).writing
}

/** Speaking prompts for a content language, falling back to English. */
export function speakingPrompts(language: string): PromptSet {
  return (SETS[language] ?? EN).speaking
}
