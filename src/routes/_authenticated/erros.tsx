import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AudioLines, Camera, ChevronRight, Keyboard, LoaderCircle, Plus, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { type ErrorOrigin } from "@/lib/error-notebook";
import { extractImageText } from "@/lib/media-capture.functions";
import { createSpeechRecognition, transcriptFromResults, type SpeechRecognitionController } from "@/lib/speech-recognition";
import { useAddErro, useErros } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/erros")({
  head: () => ({ meta: [
    { title: "Caderno de Erros — OQ lembra" },
    { name: "description", content: "Capture e compreenda erros externos com o mentor do OQ lembra." },
    { property: "og:title", content: "Caderno de Erros — OQ lembra" },
    { property: "og:description", content: "Capture, analise e transforme seus erros em aprendizado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Erros,
});

const originLabels: Record<ErrorOrigin, string> = { manual: "Digitado", audio: "Áudio", imagem: "Imagem", revisao_legada: "Importado" };

function Erros() {
  const { data: erros = [], isLoading } = useErros();
  const add = useAddErro();
  const [texto, setTexto] = useState("");
  const [origem, setOrigem] = useState<Exclude<ErrorOrigin, "revisao_legada">>("manual");
  const [extracting, setExtracting] = useState(false);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);
  const extract = useServerFn(extractImageText);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleAudio = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = createSpeechRecognition();
    if (!recognition) {
      toast.error("Seu navegador não oferece transcrição simultânea pelo microfone.");
      return;
    }
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = transcriptFromResults(event.results);
      setTexto(transcript);
      setOrigem("audio");
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Permita o acesso ao microfone para transcrever." : "A transcrição pelo microfone foi interrompida.");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setOrigem("audio");
    } catch {
      recognitionRef.current = null;
      toast.error("Não foi possível iniciar o microfone.");
    }
  };

  const selectImage = () => imageInputRef.current?.click();

  const extractFromImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 8 MB."); return; }
    setExtracting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagem inválida."));
        reader.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
        reader.readAsDataURL(file);
      });
      const result = await extract({ data: { dataUrl } });
      setTexto(result.text);
      setOrigem("imagem");
      textareaRef.current?.focus();
      toast.success("Texto extraído da imagem.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a imagem.");
    } finally {
      setExtracting(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const submit = () => {
    const clean = texto.trim();
    if (!clean) { textareaRef.current?.focus(); return; }
    add.mutate({ texto: clean, origem }, {
      onSuccess: () => { setTexto(""); setOrigem("manual"); toast.success("Erro adicionado ao Caderno."); },
      onError: () => toast.error("Não foi possível adicionar este erro."),
    });
  };

  return <AppShell>
    <header><p className="text-xs font-bold uppercase text-primary">Captura externa</p><h1 className="mt-2 text-3xl font-bold text-navy">Caderno de Erros</h1><p className="mt-2 max-w-2xl text-muted-foreground">Registre questões e raciocínios que aconteceram fora das revisões.</p></header>
    <section className="capture-panel mt-8 rounded-2xl bg-card p-6 sm:p-8" aria-labelledby="capture-title">
      <div className="mb-5 flex items-center gap-3"><span className="icon-well"><TriangleAlert /></span><div><h2 id="capture-title" className="text-lg font-bold text-navy">O que deu errado?</h2><p className="text-sm text-muted-foreground">Cole o enunciado, dite pelo microfone ou extraia o texto de uma imagem.</p></div></div>
      <Textarea ref={textareaRef} value={texto} onChange={(event) => { setTexto(event.target.value); setOrigem("manual"); }} placeholder="Registre o conteúdo bruto do erro, sem tentar corrigir ainda..." className="min-h-40 rounded-2xl p-5 text-base" />
      <input ref={imageInputRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Selecionar imagem para extração" onChange={(event) => { const file = event.target.files?.[0]; if (file) void extractFromImage(file); }} />
      {listening && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-destructive"><span className="h-2.5 w-2.5 rounded-full bg-destructive motion-safe:animate-pulse" />Microfone ativo — fale e acompanhe a transcrição acima.</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="outline" aria-pressed={listening} onClick={toggleAudio} className={listening ? "border-destructive/40 text-destructive" : ""}>{listening ? <Square /> : <AudioLines />}{listening ? "Parar gravação" : "Gravar Áudio"}</Button>
        <Button type="button" variant="outline" disabled={extracting} onClick={selectImage}>{extracting ? <LoaderCircle className="motion-safe:animate-spin" /> : <Camera />}{extracting ? "Extraindo..." : "Extrair de Imagem"}</Button>
        <Button type="button" variant="outline" onClick={() => textareaRef.current?.focus()}><Keyboard />Digitação manual</Button>
        <Button type="button" className="sm:ml-auto" disabled={!texto.trim() || add.isPending} onClick={submit}>{add.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Plus />}{add.isPending ? "Adicionando..." : "Adicionar ao Caderno"}</Button>
      </div>
    </section>
    <section className="mt-12" aria-labelledby="collection-title">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Sua coleção</p><h2 id="collection-title" className="mt-2 text-2xl font-bold text-navy">Erros capturados</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-navy">{erros.length}</span></div>
      {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}
      {!isLoading && erros.length === 0 && <div className="mt-6 rounded-2xl bg-card p-8 text-center text-muted-foreground">Seu caderno está vazio. A primeira captura aparecerá aqui.</div>}
      <div className="error-list mt-6 space-y-5">{erros.map((erro, index) => <Link key={erro.id} to="/erros/$erroId" params={{ erroId: erro.id }} className="error-card group block rounded-2xl bg-card p-6"><div className="flex items-start gap-4"><span className="error-index">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{originLabels[erro.origem]}</span><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-navy">{erro.texto}</p></div><ChevronRight className="mt-2 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" /></div></Link>)}</div>
    </section>
  </AppShell>;
}