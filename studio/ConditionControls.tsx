import React from "react";
import { Plus } from "lucide-react";
import type { Field, Rule } from "./types";

export function comparisonOptions(type: string): Record<string, string> {
  if (type === "multiple")
    return {
      contains: "Contém esta opção",
      not_contains: "Não contém esta opção",
    };
  const basic = { eq: "Igual a", ne: "Diferente de" };
  return type === "number"
    ? {
        ...basic,
        lt: "Menor que",
        lte: "Menor ou igual",
        gt: "Maior que",
        gte: "Maior ou igual",
      }
    : basic;
}

export function newCondition(field: Field): Rule {
  return {
    operator: field.type === "multiple" ? "contains" : "eq",
    value: field.options[0] || "",
    target: "next",
  };
}

export function AddConditionButton({
  field,
  onAdd,
}: {
  field: Field;
  onAdd: (rule: Rule) => void;
}) {
  return (
    <button
      type="button"
      className="btn"
      disabled={field.rules.length >= 20}
      onClick={() => onAdd(newCondition(field))}
    >
      <Plus size={15} /> Adicionar condição
    </button>
  );
}
