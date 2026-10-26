import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { SKILLS_MAX, SKILL_MAX, hasSkill, normalizeSkill } from "../../../utils/team";
import { FOCO_VISIVEL } from "../../onboarding/selecao";
import { fieldBorder } from "../../pitch/styles";

interface SkillsInputProps {
  id: string;
  value: string[];
  error?: string;
  onChange: (skills: string[]) => void;
}

export default function SkillsInput({ id, value, error, onChange }: SkillsInputProps) {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hintId = `${id}-hint`;
  const noticeId = `${id}-notice`;
  const errorId = `${id}-error`;
  const describedBy = [hintId, notice ? noticeId : null, error ? errorId : null].filter(Boolean).join(" ");

  function addSkills(parts: string[], current: string[]) {
    let next = current;
    let message = "";
    for (const part of parts) {
      const skill = normalizeSkill(part).slice(0, SKILL_MAX);
      if (!skill) continue;
      if (hasSkill(next, skill)) message = `"${skill}" já foi adicionada.`;
      else if (next.length >= SKILLS_MAX) message = `Você já adicionou ${SKILLS_MAX} competências.`;
      else next = [...next, skill];
    }
    setNotice(message);
    if (next !== current) onChange(next);
    return next;
  }

  function commitDraft() {
    if (!draft.trim()) return;
    addSkills([draft], value);
    setDraft("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const parts = event.target.value.split(",");
    if (parts.length > 1) {
      addSkills(parts.slice(0, -1), value);
      setDraft(parts[parts.length - 1]);
    } else {
      setDraft(event.target.value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never submits the form from here
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      setNotice(`"${value[value.length - 1]}" removida.`);
      onChange(value.slice(0, -1));
    }
  }

  function remove(skill: string) {
    onChange(value.filter((item) => item !== skill));
    setNotice(`"${skill}" removida.`);
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block font-medium text-deepgreen">
          Competências
        </label>
        <span className="text-xs tabular-nums text-deepgreen/75">
          <span aria-hidden="true">
            {value.length}/{SKILLS_MAX}
          </span>
          <span className="sr-only">
            {value.length} de {SKILLS_MAX} competências
          </span>
        </span>
      </div>
      <p id={hintId} className="mt-0.5 text-xs text-deepgreen/75">
        Pressione Enter ou vírgula para adicionar. Até {SKILLS_MAX}, com até {SKILL_MAX} caracteres cada.
      </p>
      <div
        className={`mt-2 flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-2xl border bg-lightgray px-3 py-2 focus-within:ring-2 focus-within:ring-deepgreen ${fieldBorder(Boolean(error))}`}
      >
        {value.length > 0 && (
          <ul aria-label="Competências adicionadas" className="contents">
            {value.map((skill) => (
              <li
                key={skill}
                className="inline-flex items-center gap-1 rounded-md bg-white py-0.5 pl-2 pr-0.5 text-xs font-medium text-deepgreen"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => remove(skill)}
                  aria-label={`Remover competência ${skill}`}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-lightgray ${FOCO_VISIVEL}`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          maxLength={SKILL_MAX}
          autoComplete="off"
          placeholder={value.length === 0 ? "Ex.: Gestão Estratégica" : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-deepgreen placeholder:text-deepgreen/60 focus:outline-none"
        />
      </div>
      <p id={noticeId} aria-live="polite" className="mt-1 text-xs text-deepgreen/80">
        {notice}
      </p>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
