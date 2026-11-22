/** Phase 18: deterministic-safe question construction; never displays the target's definition as a hint. */
export type ArcadeTerm = { id?: string; term: string; meaning?: string; definition?: string; example?: string };
export type ArcadeQuestion = { prompt: string; choices: string[]; answer: string; source: 'sentence' | 'meaning' };
export const clean = (value: string): string => value.trim().toLocaleLowerCase();
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalized = (value: string): string => clean(value).replace(/[^\p{L}\p{N}]+/gu, ' ');
const tokens = (value: string): string[] => normalized(value).split(/\s+/).filter(w => w.length > 2);
export function safeSentence(term: ArcadeTerm): string | null {
  const word = term.term.trim();
  const original = (term.example || '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
  if (!word || !original) return null;
  const matcher = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])`, 'giu');
  if (!matcher.test(original)) return null;
  const sentence = original.replace(matcher, '_____');
  // Reject any remaining occurrence of the answer, including compound forms.
  if (normalized(sentence).includes(normalized(word)) || sentence.length < 12) return null;
  return sentence;
}
export function makeQuestion(target: ArcadeTerm, pool: ArcadeTerm[], random: () => number = Math.random): ArcadeQuestion {
  const answer = target.term.trim();
  const sentence = safeSentence(target);
  const meaning = (target.meaning || target.definition || '').replace(/\[[^\]]*\]/g, '').trim();
  const targetTokens = new Set(tokens(meaning));
  const unique = new Map<string, ArcadeTerm>();
  for (const candidate of pool) {
    const word = candidate.term?.trim();
    if (word && clean(word) !== clean(answer) && !unique.has(clean(word))) unique.set(clean(word), candidate);
  }
  const scored = [...unique.values()].map(candidate => {
    const candidateTokens = tokens(candidate.meaning || candidate.definition || '');
    const overlap = candidateTokens.filter(token => targetTokens.has(token)).length;
    const lengthPenalty = Math.abs(candidate.term.length - answer.length) / 10;
    const multiwordPenalty = Number(candidate.term.includes(' ') !== answer.includes(' '));
    return { word: candidate.term.trim(), score: overlap * 3 - lengthPenalty - multiwordPenalty + random() * 0.3 };
  }).sort((a, b) => b.score - a.score);
  const choices = [answer, ...scored.slice(0, 3).map(x => x.word)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { prompt: sentence || `Chọn từ tiếng Anh phù hợp với nghĩa: “${meaning}”`, choices, answer, source: sentence ? 'sentence' : 'meaning' };
}
