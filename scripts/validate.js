#!/usr/bin/env node
/**
 * Valida um JSON no molde simulando-prova/v1 sem dependências.
 *   node scripts/validate.js prova.json
 * Sai com código 1 se houver erros. Também aceita a exportação de um simulado
 * ({"questions": [...]}) e uma lista de simulados, como a plataforma.
 */
const fs = require('fs');

const CATEGORIES = ['tecnologia', 'programacao', 'certificacoes', 'idiomas', 'concursos', 'vestibular', 'escolar', 'negocios', 'saude', 'direito', 'exatas', 'humanas', 'ciencias', 'outros'];
const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/validate.js prova.json'); process.exit(2); }

let data;
try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('JSON inválido: ' + e.message); process.exit(1); }

const errors = [];
const warnings = [];
const err = (path, msg) => errors.push(`${path}: ${msg}`);
const warn = (path, msg) => warnings.push(`${path}: ${msg}`);
const isStr = (v) => typeof v === 'string';
// Letras citadas: {{B}} na explicação (a plataforma troca pela letra da tela quando embaralha)
const TOKEN_RE = /\{\{\s*([A-Za-z])\s*\}\}/g;
const PLAIN_REF_RE = /(?:[Aa]lternativas?|[Ll]etras?|[Oo]p[çc](?:ão|ões)|[Oo]ptions?|[Aa]nswers?|[Rr]espostas?)\s*:?\s+[A-H](?![\p{L}\p{N}_])/u;
const CITES_OTHER_RE = /(?:^|[^\p{L}\p{N}_])[A-H]\s+(?:e|and|ou|or)\s+[A-H](?![\p{L}\p{N}_])/u;
const ABOVE_RE = /\b(?:todas|nenhuma)\s+(?:as|das)\s+(?:anteriores|acima)\b|\b(?:all|none)\s+of\s+the\s+above\b/i;

let simulados;
if (data && Array.isArray(data.simulados)) {
  if (!['simulando-prova/v1', 'classificados-prova/v1'].includes(data.format)) err('format', `esperado "simulando-prova/v1", veio ${JSON.stringify(data.format)}`);
  const p = data.prova || {};
  if (p.title !== undefined && (!isStr(p.title) || p.title.trim().length < 2 || p.title.length > 160)) err('prova.title', 'use 2 a 160 caracteres');
  if (p.title === undefined) warn('prova.title', 'sem título: a plataforma usa o título do primeiro simulado');
  if (p.category != null && !CATEGORIES.includes(p.category)) err('prova.category', `categoria desconhecida "${p.category}" (aceitas: ${CATEGORIES.join(', ')})`);
  if (p.icon != null && (!isStr(p.icon) || p.icon.length > 4)) err('prova.icon', 'até 4 caracteres');
  simulados = data.simulados;
} else if (data && Array.isArray(data.questions)) {
  warn('raiz', 'formato de um simulado só; a plataforma cria uma prova com ele');
  simulados = [data.exam ? { ...data.exam, questions: data.questions } : data];
} else if (Array.isArray(data)) {
  warn('raiz', 'lista de simulados sem dados da prova');
  simulados = data;
} else {
  err('raiz', 'esperado um objeto com "simulados" (ver SKILL.md)');
  simulados = [];
}

if (simulados.length === 0) err('simulados', 'precisa de pelo menos 1 simulado');
if (simulados.length > 50) err('simulados', 'máximo de 50 simulados');

const seenTexts = new Map();
let totalQ = 0;
let multi = 0;
const correctPositions = {};
simulados.forEach((sim, si) => {
  const sp = `simulados[${si}]`;
  if (!sim || typeof sim !== 'object') { err(sp, 'não é um objeto'); return; }
  if (sim.title !== undefined && (!isStr(sim.title) || sim.title.trim().length < 2 || sim.title.length > 160)) err(`${sp}.title`, 'use 2 a 160 caracteres');
  if (sim.pass_score !== undefined && (!Number.isInteger(sim.pass_score) || sim.pass_score < 1 || sim.pass_score > 100)) err(`${sp}.pass_score`, 'inteiro entre 1 e 100');
  if (sim.time_limit_min != null && (!Number.isInteger(sim.time_limit_min) || sim.time_limit_min < 1 || sim.time_limit_min > 600)) err(`${sp}.time_limit_min`, 'inteiro entre 1 e 600 ou null');
  if (!Array.isArray(sim.questions) || sim.questions.length === 0) { err(`${sp}.questions`, 'precisa de pelo menos 1 questão'); return; }
  if (sim.questions.length > 1000) err(`${sp}.questions`, 'máximo de 1000 questões');
  sim.questions.forEach((q, qi) => {
    const qp = `${sp}.questions[${qi}]`;
    totalQ++;
    if (!q || typeof q !== 'object') { err(qp, 'não é um objeto'); return; }
    if (!isStr(q.text) || q.text.trim() === '') err(`${qp}.text`, 'enunciado vazio');
    else {
      const key = q.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (seenTexts.has(key)) warn(qp, `enunciado repetido (igual a ${seenTexts.get(key)})`);
      else seenTexts.set(key, qp);
    }
    if (q.explanation !== undefined && q.explanation !== null && !isStr(q.explanation)) err(`${qp}.explanation`, 'deve ser texto ou null');
    if (!Array.isArray(q.alternatives)) { err(`${qp}.alternatives`, 'precisa de uma lista de alternativas'); return; }
    if (q.alternatives.length < 2) err(`${qp}.alternatives`, 'pelo menos 2 alternativas');
    if (q.alternatives.length > 8) err(`${qp}.alternatives`, 'no máximo 8 alternativas');
    let correct = 0;
    q.alternatives.forEach((a, ai) => {
      const ap = `${qp}.alternatives[${ai}]`;
      if (!a || typeof a !== 'object') { err(ap, 'não é um objeto'); return; }
      if (!isStr(a.text) || a.text.trim() === '') err(`${ap}.text`, 'texto vazio');
      if (a.is_correct !== undefined && typeof a.is_correct !== 'boolean') err(`${ap}.is_correct`, 'deve ser true/false');
      if (a.is_correct === true) { correct++; correctPositions[ai] = (correctPositions[ai] || 0) + 1; }
    });
    if (correct === 0) err(`${qp}.alternatives`, 'nenhuma alternativa marcada com "is_correct": true');
    if (correct > 1) multi++;
    const n = q.alternatives.length;
    if (isStr(q.explanation)) {
      for (const m of q.explanation.matchAll(TOKEN_RE)) {
        const i = m[1].toUpperCase().charCodeAt(0) - 65;
        if (i >= n || i > 7) err(`${qp}.explanation`, `cita ${m[0]}, mas a questão tem ${n} alternativas (de {{A}} a {{${String.fromCharCode(64 + Math.min(n, 8))}}})`);
      }
      if (PLAIN_REF_RE.test(q.explanation)) warn(`${qp}.explanation`, 'cite alternativas pela letra entre chaves, como {{B}}: a letra acompanha o embaralhamento');
    }
    if (isStr(q.text) && /\{\{\s*[A-Za-z]\s*\}\}/.test(q.text)) warn(`${qp}.text`, '{{B}} só é trocado na explicação; no enunciado fica como está');
    q.alternatives.forEach((a, ai) => {
      if (!a || !isStr(a.text)) return;
      if (CITES_OTHER_RE.test(a.text) || ABOVE_RE.test(a.text) || /\{\{\s*[A-Za-z]\s*\}\}/.test(a.text)) warn(`${qp}.alternatives[${ai}].text`, 'alternativa que cita outras ("A e B", "todas as anteriores") fica errada quando as alternativas são embaralhadas');
    });
  });
});

if (totalQ >= 8) {
  const counts = Object.values(correctPositions);
  const max = Math.max(...counts, 0);
  if (max / totalQ > 0.7) warn('alternativas', 'a resposta correta está quase sempre na mesma posição; varie');
}

console.log(`Simulados: ${simulados.length} · Questões: ${totalQ} · Com mais de uma correta: ${multi}`);
simulados.forEach((sim, si) => { if (sim && Array.isArray(sim.questions)) console.log(`  ${si + 1}. ${sim.title || '(sem título)'} — ${sim.questions.length} questão(ões)${sim.time_limit_min ? `, ${sim.time_limit_min} min` : ''}${sim.pass_score ? `, mínimo ${sim.pass_score}%` : ''}`); });
warnings.forEach((w) => console.log('  aviso: ' + w));
errors.forEach((e) => console.log('  ERRO: ' + e));
console.log(errors.length ? `\n${errors.length} erro(s): corrija antes de importar.` : '\nOK: pronto para importar.');
process.exit(errors.length ? 1 : 0);
