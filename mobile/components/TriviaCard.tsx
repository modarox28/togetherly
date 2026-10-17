import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import type { TriviaState } from "@/hooks/useRoom";

// Trivia al final de la película, encima del video (igual que el panel de la extensión).
// Todo el texto es plano: nunca se interpreta como código ni enlace.

interface Props {
  trivia: TriviaState | null;
  offer: string | null;
  error: string | null;
  onStart: () => void;
  onDismissOffer: () => void;
  onAnswer: (id: number, index: number, choice: number) => void;
  onSubmit: (id: number, question: string, options: string[], answer: number) => void;
  onControl: (action: "begin" | "stop") => void;
}

function Button({ label, onPress, soft }: { label: string; onPress: () => void; soft?: boolean }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full px-4 py-2 ${soft ? "bg-cozy-plum" : "bg-cozy-lamp"}`}>
      <Text className={`font-extrabold text-sm ${soft ? "text-cozy-cream" : "text-cozy-deep"}`}>{label}</Text>
    </Pressable>
  );
}

export function TriviaCard({ trivia, offer, error, onStart, onDismissOffer, onAnswer, onSubmit, onControl }: Props) {
  const [closedId, setClosedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [draftFor, setDraftFor] = useState<number | null>(null);

  // Cada trivia nueva empieza con el formulario vacío.
  if (trivia && trivia.id !== draftFor) {
    setDraftFor(trivia.id);
    setQuestion("");
    setOptions(["", "", "", ""]);
    setAnswer(null);
    setNote("");
  }

  const ticking = !!trivia && (trivia.phase === "question" || trivia.phase === "collect");
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  const showGame = !!trivia && !(trivia.phase === "end" && closedId === trivia.id);
  const showOffer = offer !== null && (!trivia || trivia.phase === "end");
  if (!showGame && !showOffer) return null;
  const left = trivia?.endsAt ? Math.max(0, Math.min(99, Math.floor((trivia.endsAt - now) / 1000))) : null;

  let header = "🎯 Trivia";
  let body: React.ReactNode = null;

  if (!showGame) {
    body = (
      <>
        <Text className="text-cozy-cream font-extrabold text-base mb-3">
          {offer ? `¿Jugamos una trivia de «${offer}»?` : "¿Jugamos una trivia?"}
        </Text>
        <View className="flex-row gap-2">
          <Button label="Jugar" onPress={onStart} />
          <Button label="Ahora no" soft onPress={onDismissOffer} />
        </View>
      </>
    );
  } else if (trivia!.phase === "loading") {
    body = <Text className="text-cozy-cream font-extrabold">Preparando preguntas de «{trivia!.title}»…</Text>;
  } else if (trivia!.phase === "collect") {
    header = "🎯 Trivia entre amigos";
    const t = trivia!;
    body = t.you.submitted ? (
      <Text className="text-cozy-cream font-extrabold">¡Listo! Esperando las preguntas de los demás…</Text>
    ) : (
      <>
        <Text className="text-cozy-muted text-xs mb-2">Escribe una pregunta sobre lo que vieron y marca con ✓ la correcta.</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Tu pregunta"
          placeholderTextColor="#8E80A6"
          maxLength={160}
          className="bg-cozy-deep text-cozy-cream rounded-xl px-3 py-2 mb-2"
        />
        {options.map((value, i) => (
          <View key={i} className="flex-row items-center gap-2 mb-2">
            <TextInput
              value={value}
              onChangeText={(v) => setOptions((list) => list.map((o, j) => (j === i ? v : o)))}
              placeholder={i < 2 ? `Opción ${i + 1}` : `Opción ${i + 1} (opcional)`}
              placeholderTextColor="#8E80A6"
              maxLength={60}
              className="flex-1 bg-cozy-deep text-cozy-cream rounded-xl px-3 py-2"
            />
            <Pressable
              onPress={() => setAnswer(i)}
              accessibilityLabel={`Marcar la opción ${i + 1} como correcta`}
              className={`w-9 h-9 rounded-full items-center justify-center ${answer === i ? "bg-[#6FD3A8]" : "bg-cozy-plum"}`}
            >
              <Text className={`font-extrabold ${answer === i ? "text-cozy-deep" : "text-cozy-cream"}`}>✓</Text>
            </Pressable>
          </View>
        ))}
        <Button
          label="Enviar pregunta"
          onPress={() => {
            const filled = options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
            const correct = filled.findIndex((x) => x.i === answer);
            if (question.trim().length < 3 || filled.length < 2 || correct === -1) {
              setNote("Escribe la pregunta, al menos 2 opciones y marca la correcta con ✓");
              return;
            }
            setNote("");
            onSubmit(t.id, question, filled.map((x) => x.o), correct);
          }}
        />
      </>
    );
    body = (
      <>
        {body}
        <Text className="text-cozy-muted text-xs mt-2">
          {t.submitted} de {t.players} ya escribieron
        </Text>
        {t.you.canStop && t.submitted > 0 ? (
          <View className="mt-2 flex-row">
            <Button label="Empezar ya" soft onPress={() => onControl("begin")} />
          </View>
        ) : null}
      </>
    );
  } else if (trivia!.phase === "question" || trivia!.phase === "reveal") {
    const t = trivia!;
    header = `🎯 Pregunta ${t.index + 1} de ${t.total}`;
    const hit = t.you.choice !== null && t.you.choice === t.correct;
    body = (
      <>
        {t.author ? <Text className="text-cozy-muted text-xs mb-1">Pregunta de {t.you.isAuthor ? "ti" : t.author}</Text> : null}
        <Text className="text-cozy-cream font-extrabold text-base mb-2">{t.question}</Text>
        {t.options.map((option, i) => {
          const right = t.phase === "reveal" && t.correct === i;
          const wrong = t.phase === "reveal" && t.you.choice === i && !right;
          const disabled = t.phase === "reveal" || t.you.answered || t.you.isAuthor;
          return (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => onAnswer(t.id, t.index, i)}
              className={`rounded-xl px-3 py-2.5 mb-2 ${right ? "bg-[#6FD3A8]" : wrong ? "bg-[#FF9AA2]" : "bg-cozy-deep"} ${t.you.choice === i && !right && !wrong ? "border-2 border-cozy-lamp" : ""}`}
            >
              <Text className={`font-bold ${right || wrong ? "text-cozy-deep" : "text-cozy-cream"}`}>{option}</Text>
            </Pressable>
          );
        })}
        <Text className="text-cozy-muted text-xs">
          {t.phase === "reveal"
            ? t.you.isAuthor
              ? "Así les fue con tu pregunta"
              : hit
                ? "¡Correcto! 🎉"
                : t.you.answered
                  ? "Esta no fue 😅"
                  : "Se acabó el tiempo"
            : t.you.isAuthor
              ? "Es tu pregunta: mira cómo les va"
              : `${t.answered} de ${t.players} respondieron`}
        </Text>
      </>
    );
  } else {
    const t = trivia!;
    header = "🏆 Resultados";
    body = (
      <>
        {t.total === 0 ? <Text className="text-cozy-muted text-xs mb-2">Nadie escribió preguntas esta vez.</Text> : null}
        {t.scores.slice(0, 8).map((s, i) => (
          <View key={`${s.name}-${i}`} className="flex-row items-center gap-2 mb-1">
            <Text className="w-7">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}</Text>
            <Text className="text-cozy-cream flex-1" numberOfLines={1}>
              {s.avatar} {s.name}
            </Text>
            <Text className="text-cozy-lamp font-extrabold">{s.points}</Text>
          </View>
        ))}
        <View className="flex-row mt-2">
          <Button label="Cerrar" soft onPress={() => setClosedId(t.id)} />
        </View>
      </>
    );
  }

  return (
    <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, maxHeight: "85%" }}>
      <ScrollView className="bg-cozy-card rounded-3xl" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center mb-2 gap-2">
          <Text className="text-cozy-lamp font-extrabold flex-1">{header}</Text>
          {left !== null && trivia && (trivia.phase === "question" || trivia.phase === "collect") ? (
            <Text className="text-cozy-muted text-xs">{left} s</Text>
          ) : null}
          {showGame && trivia!.you.canStop && trivia!.phase !== "end" ? (
            <Pressable onPress={() => onControl("stop")} className="bg-cozy-plum rounded-full px-3 py-1">
              <Text className="text-cozy-cream text-xs font-bold">Terminar</Text>
            </Pressable>
          ) : null}
        </View>
        {body}
        {error || note ? <Text className="text-[#FF9AA2] text-xs mt-2">{note || error}</Text> : null}
      </ScrollView>
    </View>
  );
}
