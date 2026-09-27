/**
 * Lexical signal extraction — v2
 * Purely deterministic signals with narrative arc awareness.
 * No AI needed.
 */

const HOOK_PATTERNS = /^(nobody|everyone|the biggest|here's the thing|what most|you need to|let me tell|the truth is|i learned|the secret|most people|here's what|listen|stop|imagine|forget everything|i never|i didn't|the problem|what i|i want to tell|today i|truth be told|but here)/i;
const CURIOSITY_PATTERNS = /\b(three things|three stories|you won't believe|what happened next|but then|little did i|the twist|what if|nobody knows|i want to tell you|let me explain|the reason|what most people|here is what)/i;
const PAYOFF_PATTERNS = /\b(looking back|that's when i realized|in the end|it turned out|the lesson|best decision|worst decision|changed everything|it was one of|i finally|years later|and that's how|that changed|it turns out)\b/i;
const CONTRAST_PATTERNS = /\b(but |however|although|instead|until |then |yet |even though|i thought|i realized|but then|but here|but i|but it|rather than|despite)\b/i;
const EMOTION_STRONG = /\b(terrified|desperate|devastated|incredible|amazing|passionate|heartbreak|furious|ecstatic|overwhelming|fear|love|hate|anger|joy|grief|pain|sacrifice|struggle|nightmare|dream|impossible|insane|beautiful|tragic|horrible|terrifying)\b/i;
const EMOTION_MEDIUM = /\b(hard|difficult|crazy|wild|intense|powerful|emotional|touched|inspired|proud|grateful|honest|real|raw|vulnerable|sincere|funny|sad|angry|happy|excited|nervous|scared|worried|confused|frustrated)\b/i;
const NARRATIVE_MARKERS = /\b(first|second|third|then|after that|years ago|one day|that day|eventually|finally|suddenly|meanwhile|later|earlier|in the beginning|at first|started)\b/i;
