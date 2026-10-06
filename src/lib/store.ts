import { useSyncExternalStore } from "react";

export type Bloco = { texto: string; keywords: string[]; dica: string; revelado: boolean };
export type Lembrete = { id: string; titulo: string; materia: string; blocos: Bloco[] };
export type Erro = { id: string; lembrete: string; materia: string; texto: string; dica: string };

/** Reveals hidden blocks whose keyword appears in the typed text (case/accent-insensitive). */
export function revelarBlocos(blocos: Bloco[], digitado: string): Bloco[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const t = norm(digitado);
  if (!t.trim()) return blocos;
  return blocos.map((b) =>
    b.revelado || !b.keywords.some((k) => t.includes(norm(k))) ? b : { ...b, revelado: true },
  );
}

const b = (texto: string, keywords: string[], dica: string): Bloco => ({ texto, keywords, dica, revelado: false });

let lembretes: Lembrete[] = [
  {
    id: "1",
    titulo: "Insuficiência Cardíaca",
    materia: "Cardiologia",
    blocos: [
      b("Principal causa: doença arterial coronariana", ["coronariana", "coronária"], "Pense nas artérias do coração"),
      b("Classificação funcional pela NYHA (I a IV)", ["NYHA"], "Sigla de uma associação de Nova York"),
      b("BNP elevado sugere disfunção ventricular", ["BNP"], "Peptídeo natriurético"),
      b("Tratamento base: IECA + betabloqueador", ["IECA", "betabloqueador"], "Duas classes que reduzem mortalidade"),
    ],
  },
  {
    id: "2",
    titulo: "Diabetes Mellitus tipo 2",
    materia: "Endocrinologia",
    blocos: [
      b("Diagnóstico: glicemia de jejum ≥ 126 mg/dL", ["126"], "Número entre 120 e 130"),
      b("HbA1c ≥ 6,5% confirma o diagnóstico", ["6,5", "hemoglobina glicada"], "Seis e meio"),
      b("Primeira linha: metformina", ["metformina"], "Biguanida"),
    ],
  },
  {
    id: "3",
    titulo: "Pneumonia Comunitária",
    materia: "Pneumologia",
    blocos: [
      b("Agente mais comum: Streptococcus pneumoniae", ["pneumoniae", "pneumococo"], "Diplococo gram-positivo"),
      b("Escore de gravidade: CURB-65", ["CURB"], "Confusão, Ureia, Respiração..."),
    ],
  },
];

let erros: Erro[] = [
  { id: "e1", lembrete: "Insuficiência Cardíaca", materia: "Cardiologia", texto: "BNP elevado sugere disfunção ventricular", dica: "Peptídeo natriurético" },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export const useLembretes = () => useSyncExternalStore(subscribe, () => lembretes, () => lembretes);
export const useErros = () => useSyncExternalStore(subscribe, () => erros, () => erros);

export function addLembrete(l: Omit<Lembrete, "id">) {
  lembretes = [{ ...l, id: crypto.randomUUID() }, ...lembretes];
  emit();
}
export function addErros(lem: Lembrete, blocos: Bloco[]) {
  const novos = blocos
    .filter((x) => !erros.some((e) => e.texto === x.texto))
    .map((x) => ({ id: crypto.randomUUID(), lembrete: lem.titulo, materia: lem.materia, texto: x.texto, dica: x.dica }));
  erros = [...novos, ...erros];
  emit();
}
export function removeErro(id: string) {
  erros = erros.filter((e) => e.id !== id);
  emit();
}
