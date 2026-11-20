interface ExplanationSkill {
  readonly key: string
  readonly label: string
}

/** Returns display labels per reason, keeping each match in its first reason. */
export function deduplicateExplanationSkills(
  reasons: readonly (readonly ExplanationSkill[])[],
): string[][] {
  const shown = new Set<string>()

  return reasons.map(skills => {
    const labels: string[] = []
    for (const { key, label } of skills) {
      if (shown.has(key)) continue
      shown.add(key)
      labels.push(label)
    }
    return labels
  })
}
