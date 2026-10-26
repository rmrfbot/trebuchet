const MODEL = "@cf/meta/llama-3.2-3b-instruct";

const LIMITS = {
  mass_g: [20, 20000],
  r_max_mm: [25, 90],
  r_min_mm: [4, 24],
  arm_length_mm: [80, 500],
  drop_height_mm: [400, 1500],
  playback_speed: [0.1, 1]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function clampNumber(value, fallback, [min, max]) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
}

async function parsePrompt(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 1000) {
    return json({ error: "Prompt must contain between 1 and 1000 characters." }, 400);
  }
  if (!env.AI) {
    return json({ error: "Cloudflare Workers AI is not configured for this deployment." }, 503);
  }

  const current = body?.currentState && typeof body.currentState === "object"
    ? body.currentState
    : {};
  const defaults = {
    mass_g: clampNumber(current.mass_g, 350, LIMITS.mass_g),
    spindle_profile: ["linear", "parabolic", "exponential"].includes(current.spindle_profile)
      ? current.spindle_profile
      : "linear",
    r_max_mm: clampNumber(current.r_max_mm, 49, LIMITS.r_max_mm),
    r_min_mm: clampNumber(current.r_min_mm, 9.7, LIMITS.r_min_mm),
    arm_length_mm: clampNumber(current.arm_length_mm, 140.462, LIMITS.arm_length_mm),
    drop_height_mm: clampNumber(current.drop_height_mm, 920.75, LIMITS.drop_height_mm),
    playback_speed: clampNumber(current.playback_speed, 0.25, LIMITS.playback_speed)
  };

  let result;
  try {
    result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: `Interpret a user's physics trebuchet simulation command. Return only a JSON object with these keys: mass_g (20-20000), spindle_profile ("linear", "parabolic", or "exponential"), r_max_mm (25-90), r_min_mm (4-24), arm_length_mm (80-500), drop_height_mm (400-1500), playback_speed (0.1-1), and insight (one concise sentence explaining the physics). For values not changed by the command, preserve the supplied current state. Do not claim a change unless you set its value.`
        },
        {
          role: "user",
          content: `Current state: ${JSON.stringify(defaults)}. Command: ${prompt}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 350,
      temperature: 0.2
    });
  } catch (error) {
    return json({ error: `Workers AI request failed: ${error.message}` }, 502);
  }
  let parsed;
  if (result?.response && typeof result.response === "object" && !Array.isArray(result.response)) {
    parsed = result.response;
  } else {
    const responseText = typeof result?.response === "string"
      ? result.response
      : typeof result === "string"
        ? result
        : null;
    if (!responseText) {
      return json({ error: "Workers AI returned no JSON response." }, 502);
    }

    try {
      parsed = JSON.parse(responseText);
    } catch {
      return json({ error: "Workers AI returned malformed JSON." }, 502);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return json({ error: "Workers AI returned no JSON response." }, 502);
  }

  return json({
    mass_g: clampNumber(parsed.mass_g, defaults.mass_g, LIMITS.mass_g),
    spindle_profile: ["linear", "parabolic", "exponential"].includes(parsed.spindle_profile)
      ? parsed.spindle_profile
      : defaults.spindle_profile,
    r_max_mm: clampNumber(parsed.r_max_mm, defaults.r_max_mm, LIMITS.r_max_mm),
    r_min_mm: clampNumber(parsed.r_min_mm, defaults.r_min_mm, LIMITS.r_min_mm),
    arm_length_mm: clampNumber(parsed.arm_length_mm, defaults.arm_length_mm, LIMITS.arm_length_mm),
    drop_height_mm: clampNumber(parsed.drop_height_mm, defaults.drop_height_mm, LIMITS.drop_height_mm),
    playback_speed: clampNumber(parsed.playback_speed, defaults.playback_speed, LIMITS.playback_speed),
    insight: typeof parsed.insight === "string" ? parsed.insight.slice(0, 500) : ""
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/parse") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
      }
      return parsePrompt(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
