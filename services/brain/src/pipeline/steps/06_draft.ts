// IBM: Granite — plain-language letter generation (Ajit)
// Built with IBM Bob — AI SDLC Partner

import type { ProofCard, HoldEvent, Draft } from "@pramaan/contracts";

export async function draft(
  cards: ProofCard[],
  hold: HoldEvent | null,
  template: string
): Promise<Draft> {
  // ═══════════════ AJIT SEAM — START ═══════════════
  const AI_BANNER = "AI-generated — review before sending";

  // Determine LLM path: LM Studio (local) or IBM watsonx (cloud)
  const USE_LOCAL_LLM = !process.env.WATSONX_API_KEY || process.env.USE_LOCAL_LLM === "true";

  // Only gap cards belong in a dispute letter
  const gapCards = cards.filter((c) => c.status === "gap");
  if (gapCards.length === 0) {
    return templateFillStub(cards, hold, template);
  }

  // Build a grounded prompt from gap card data only — no hallucination surface
  const prompt =
    "You are a professional medical billing advocate. Write a formal complaint letter to the hospital billing department.\n\n" +
    "OVERCHARGES DETECTED:\n" +
    gapCards
      .map(
        (c, i) =>
          `${i + 1}. ${c.item}: Charged ₹${c.your_value}, Official rate ₹${c.official_value}, Overcharge ₹${c.gap}. ${c.rule_says_plain}`
      )
      .join("\n") +
    (hold !== null
      ? `\n\nPROVISIONAL HOLD: A hold of ₹${hold.amount} has been placed on this invoice. It will auto-release in 72 hours unless confirmed by the patient.`
      : "") +
    "\n\nINSTRUCTIONS:\n" +
    "- Use ONLY the numbers provided above. Do not invent any amounts.\n" +
    "- Keep the tone professional, factual, and firm.\n" +
    "- Request a refund of the overcharged amount.\n" +
    "- Reference the official source for each overcharge.\n" +
    "- End with a request for written confirmation of the refund.";

  try {
    let draftText = "";

    if (USE_LOCAL_LLM) {
      // ── PATH A: LM Studio Local Fallback ──────────────────────────────
      console.log("[06_draft] Using LM Studio local LLM");

      const response = await fetch("http://localhost:1234/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GRANITE_MODEL || "granite-4.1-8b",
          messages: [
            {
              role: "system",
              content:
                "You are a formal complaint letter writer for hospital billing disputes. Use ONLY the numbers provided in the user message. Do not invent any amounts. Keep tone professional, factual, and firm. Reference the official source for each overcharge.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 250,
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`LM Studio error: ${response.status}`);
      const data = (await response.json()) as any;
      draftText = data.choices?.[0]?.message?.content || "";

      if (!draftText.trim()) throw new Error("LM Studio returned empty text");
    } else {
      // ── PATH B: IBM watsonx.ai Granite (when credentials available) ───
      console.log("[06_draft] Using IBM watsonx.ai Granite");

      const { WatsonXAI } = await import("@ibm-cloud/watsonx-ai");
      const wx = new WatsonXAI({
        apikey: process.env.WATSONX_API_KEY!,
        serviceUrl: process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com",
      });

      const graniteResponse = await Promise.race([
        wx
          .generateText({
            modelId: process.env.GRANITE_MODEL_ID || "ibm/granite-3-8b-instruct",
            input: prompt,
            parameters: { max_new_tokens: 500, temperature: 0.2 },
          })
          .then((res: any) => res.result.results[0].generated_text),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Granite timeout")), 10_000)
        ),
      ]);

      draftText = graniteResponse;
    }

    // ── NUMBER GUARD (applies to BOTH paths) ────────────────────────────
    const numbersInText = draftText.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/gi) || [];
    const validNumbers = new Set([
      ...gapCards.map((c) => String(c.your_value)),
      ...gapCards.map((c) => String(c.official_value)),
      ...gapCards.map((c) => String(c.gap)),
      hold ? String(hold.amount) : "",
    ]);

    const hasHallucinatedNumber = numbersInText.some((n) => {
      const cleaned = n.replace(/[₹,\sRs\.INRinr]/gi, "").replace(/,/g, "");
      const numVal = parseFloat(cleaned);
      return !isNaN(numVal) && !validNumbers.has(cleaned) && !validNumbers.has(String(numVal));
    });

    if (hasHallucinatedNumber) {
      console.error("[06_draft] Number guard triggered — hallucinated value detected. Falling back to template.");
      throw new Error("Hallucinated number — falling back to template");
    }

    return { text: draftText.trim(), banner: AI_BANNER };
  } catch (err) {
    console.error("[06_draft] LLM failed, using template fallback:", err);
    return templateFillStub(cards, hold, template);
  }
  // ═══════════════ AJIT SEAM — END ══════════════════
}

function templateFillStub(
  cards: ProofCard[],
  hold: HoldEvent | null,
  template: string
): Draft {
  const gapCards = cards.filter((c) => c.status === "gap");

  let text =
    template ||
    "To Whom It May Concern,\n\nI am writing to dispute the following charges on my document:\n\n{{ITEMS}}\n\nKindly review and issue an immediate correction or refund.\n\nYours sincerely.";

  if (gapCards.length > 0) {
    const items = gapCards
      .map(
        (c) =>
          `- ${c.item}: charged ₹${c.your_value} vs official ₹${c.official_value} (gap: ₹${c.gap}). ${c.rule_says_plain}`
      )
      .join("\n");
    text = text.replace("{{ITEMS}}", items);
    text = text.replace("{{ITEM}}", gapCards[0]?.item ?? "");
    text = text.replace("{{YOUR_VALUE}}", String(gapCards[0]?.your_value ?? ""));
    text = text.replace("{{OFFICIAL_VALUE}}", String(gapCards[0]?.official_value ?? ""));
    text = text.replace("{{GAP}}", String(gapCards[0]?.gap ?? ""));
    text = text.replace("{{SOURCE}}", gapCards[0]?.rule_anchor?.url ?? "");
  }

  if (hold !== null) {
    text += `\n\nNote: A provisional hold of ₹${hold.amount} has been placed on invoice ${hold.invoice_id}, set to auto-release in 72 hours unless confirmed (hold ID: ${hold.hold_id}).`;
  }

  return {
    text,
    banner: "AI-generated — review before sending",
  };
}
