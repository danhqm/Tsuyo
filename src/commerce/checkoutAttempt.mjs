export function readAttempt(fingerprint) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("tsuyo-checkout"));
    if (saved?.fingerprint === fingerprint) return saved;
  } catch {}
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    fingerprint,
    key: crypto.randomUUID(),
    access_token: Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
