/**
 * The closed expression language (Brief 01 §1, rule 2).
 * One grammar for everything numeric in rules data: flat numbers ("2"),
 * dice ("8d6", "1d10 + level"), and formulas ("-2 * exhaustion_level").
 * No arbitrary code, fixed variable set, same evaluator on client and server.
 *
 * Grammar (precedence low→high):
 *   expr    := term (('+'|'-') term)*
 *   term    := factor (('*') factor)*        // division intentionally omitted v1 ("round down" traps; add when a rule needs it)
 *   factor  := '-' factor | NUMBER | DICE | VARIABLE | '(' expr ')'
 *   DICE    := NUMBER 'd' NUMBER
 */

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const EXPR_VARIABLES = [
  'level',
  'prof_bonus',
  'exhaustion_level',
  'spell_mod',
  'str_mod', 'dex_mod', 'con_mod', 'int_mod', 'wis_mod', 'cha_mod',
] as const;
export type ExprVariable = (typeof EXPR_VARIABLES)[number];

export type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'dice'; count: number; sides: number }
  | { kind: 'var'; name: ExprVariable }
  | { kind: 'neg'; of: ExprNode }
  | { kind: 'add' | 'sub' | 'mul'; left: ExprNode; right: ExprNode };

export class ExprParseError extends Error {}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'dice'; count: number; sides: number }
  | { t: 'var'; name: ExprVariable }
  | { t: '+' | '-' | '*' | '(' | ')' };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = src.trim();
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === '+' || c === '-' || c === '*' || c === '(' || c === ')') { toks.push({ t: c }); i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j]!)) j++;
      // dice? NdM
      if (s[j] === 'd' && /[0-9]/.test(s[j + 1] ?? '')) {
        let k = j + 1;
        while (k < s.length && /[0-9]/.test(s[k]!)) k++;
        toks.push({ t: 'dice', count: Number(s.slice(i, j)), sides: Number(s.slice(j + 1, k)) });
        i = k; continue;
      }
      toks.push({ t: 'num', v: Number(s.slice(i, j)) });
      i = j; continue;
    }
    if (/[a-z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z_0-9]/.test(s[j]!)) j++;
      const name = s.slice(i, j);
      if (!(EXPR_VARIABLES as readonly string[]).includes(name)) {
        throw new ExprParseError(`Unknown variable "${name}" — allowed: ${EXPR_VARIABLES.join(', ')}`);
      }
      toks.push({ t: 'var', name: name as ExprVariable });
      i = j; continue;
    }
    throw new ExprParseError(`Unexpected character "${c}" in expression "${src}"`);
  }
  return toks;
}

export function parseExpr(src: string): ExprNode {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];

  function factor(): ExprNode {
    const t = next();
    if (!t) throw new ExprParseError(`Unexpected end of expression "${src}"`);
    if (t.t === '-') return { kind: 'neg', of: factor() };
    if (t.t === 'num') return { kind: 'num', value: t.v };
    if (t.t === 'dice') {
      if (t.count < 1 || t.count > 100 || t.sides < 2 || t.sides > 100) {
        throw new ExprParseError(`Dice out of range: ${t.count}d${t.sides}`);
      }
      return { kind: 'dice', count: t.count, sides: t.sides };
    }
    if (t.t === 'var') return { kind: 'var', name: t.name };
    if (t.t === '(') {
      const inner = expr();
      const close = next();
      if (!close || close.t !== ')') throw new ExprParseError(`Missing ")" in "${src}"`);
      return inner;
    }
    throw new ExprParseError(`Unexpected token in "${src}"`);
  }
  function term(): ExprNode {
    let node = factor();
    while (peek()?.t === '*') { next(); node = { kind: 'mul', left: node, right: factor() }; }
    return node;
  }
  function expr(): ExprNode {
    let node = term();
    for (;;) {
      const p = peek();
      if (p?.t === '+') { next(); node = { kind: 'add', left: node, right: term() }; }
      else if (p?.t === '-') { next(); node = { kind: 'sub', left: node, right: term() }; }
      else break;
    }
    return node;
  }
  const root = expr();
  if (pos !== toks.length) throw new ExprParseError(`Trailing tokens in "${src}"`);
  return root;
}

/** True if the expression contains no dice terms (safe to evaluate without an RNG, e.g. for display/greying). */
export function isDeterministic(node: ExprNode): boolean {
  switch (node.kind) {
    case 'num': case 'var': return node.kind !== 'var' || true;
    case 'dice': return false;
    case 'neg': return isDeterministic(node.of);
    default: return isDeterministic(node.left) && isDeterministic(node.right);
  }
}

export type ExprContext = Partial<Record<ExprVariable, number>>;
export interface RolledDie { sides: number; result: number }
export interface ExprResult { total: number; rolls: RolledDie[] }

/** rng() must return an integer in [1, sides]. Server passes CSPRNG; tests pass a seeded stub. */
export function evaluateExpr(
  node: ExprNode,
  ctx: ExprContext,
  rng?: (sides: number) => number,
): ExprResult {
  const rolls: RolledDie[] = [];
  function ev(n: ExprNode): number {
    switch (n.kind) {
      case 'num': return n.value;
      case 'var': {
        const v = ctx[n.name];
        if (v === undefined) throw new ExprParseError(`Variable "${n.name}" missing from context`);
        return v;
      }
      case 'dice': {
        if (!rng) throw new ExprParseError('Expression contains dice but no RNG was provided');
        let sum = 0;
        for (let i = 0; i < n.count; i++) {
          const r = rng(n.sides);
          rolls.push({ sides: n.sides, result: r });
          sum += r;
        }
        return sum;
      }
      case 'neg': return -ev(n.of);
      case 'add': return ev(n.left) + ev(n.right);
      case 'sub': return ev(n.left) - ev(n.right);
      case 'mul': return ev(n.left) * ev(n.right);
    }
  }
  return { total: ev(node), rolls };
}

/** Convenience: parse + evaluate a source string. */
export function evalExprString(src: string, ctx: ExprContext, rng?: (sides: number) => number): ExprResult {
  return evaluateExpr(parseExpr(src), ctx, rng);
}
