# Recall Master

Crie um app React/Vite com Tailwind e shadcn/ui chamado "OQ lembra" (focado em Active Recall).

1. Design System (OQ MED)

Cores: Fundo bg-slate-50. Títulos/Painéis em Azul Marinho. Botões de ação e tabs em Azul Vibrante. Verde (acerto), Vermelho (erro).

Soft UI & Bordas: Sombras muito suaves (shadow-sm) em cards/inputs para efeito flutuante. Obrigatoriamente rounded-2xl em todos os elementos. Tags em pílula (rounded-full).

Tipografia e Ícones: Sans-serif limpa (negrito para hierarquia). Ícones Lucide React estilo outline (minimalista).

2. Rotas e Menu Lateral

Sidebar fixo com: 🧠 Revisar (/revisar), ✍️ Criar (/criar), 📘 Caderno de Erros (/erros).

Login (/login): Logo "OQ MED", input usuário/senha, botão Azul Vibrante.

3. Estrutura de Dados (Mock)

Lembrete: { titulo, materia }

Bloco: { texto, keywords: string[], dica, revelado: boolean }

4. Telas e UX/UX Core

/criar: Textarea grande flutuante + botão "Gerar Nota (IA)". Mostre um preview de lista mockada para o usuário salvar.

/revisar (O Roteiro Principal):

Lista de cards de lembretes. Ao clicar, abre o Modo Estudo.

UX do Modo Estudo:

Renderize a nota em tópicos curtos (bullet points).

Efeito Máscara: Se revelado: false, o texto deve ter as classes Tailwind: blur-sm opacity-80 select-none transition-all duration-500.

Dica: botão💡 ao lado do texto; no hover/click exibe a dica (Tooltip do shadcn).

Interação: No rodapé, fixe um input de texto com botão de microfone.

Lógica de Revelação: No onChange do input, varra as keywords dos blocos ocultos. Se o texto digitado incluir uma keyword ➔ altere revelado: true e o blur sumirá suavemente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a019aabb-4ed4-429d-ad74-3c6ac0b6d92a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
