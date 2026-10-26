import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

function request(body, method = "POST") {
  return new Request("https://trebuchet.test/api/parse", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? body : undefined
  });
}

test("rejects non-POST API requests", async () => {
  const response = await worker.fetch(request(undefined, "GET"), {});
  assert.equal(response.status, 405);
});

test("rejects malformed and invalid prompts", async () => {
  const malformed = await worker.fetch(request("{"), {});
  assert.equal(malformed.status, 400);

  const emptyPrompt = await worker.fetch(request(JSON.stringify({ prompt: "  " })), {});
  assert.equal(emptyPrompt.status, 400);

  const longPrompt = await worker.fetch(request(JSON.stringify({ prompt: "x".repeat(1001) })), {});
  assert.equal(longPrompt.status, 400);
});

test("reports an unconfigured Workers AI binding", async () => {
  const response = await worker.fetch(request(JSON.stringify({ prompt: "Try 100g" })), {});
  assert.equal(response.status, 503);
});

test("parses and clamps the Workers AI result", async () => {
  const ai = {
    run: async (model, input) => {
      assert.equal(model, "@cf/meta/llama-3.2-3b-instruct");
      assert.match(input.messages[1].content, /Try 100g/);
      return {
        response: JSON.stringify({
          mass_g: 25000,
          spindle_profile: "parabolic",
          r_max_mm: 49,
          r_min_mm: 7,
          arm_length_mm: 160,
          drop_height_mm: 950,
          playback_speed: 0.5,
          insight: "A heavier counterweight increases the available torque."
        })
      };
    }
  };
  const response = await worker.fetch(
    request(JSON.stringify({ prompt: "Try 100g" })),
    { AI: ai }
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.mass_g, 20000);
  assert.equal(result.spindle_profile, "parabolic");
  assert.equal(result.playback_speed, 0.5);
  assert.match(result.insight, /torque/);
});

test("returns an explicit error when the AI response is malformed", async () => {
  const response = await worker.fetch(
    request(JSON.stringify({ prompt: "Try a lighter weight" })),
    { AI: { run: async () => ({ response: "not json" }) } }
  );

  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /malformed JSON/);
});

test("supports object-form JSON output from Workers AI", async () => {
  const response = await worker.fetch(
    request(JSON.stringify({ prompt: "Use 200g" })),
    {
      AI: {
        run: async () => ({
          response: {
            mass_g: 200,
            spindle_profile: "linear",
            r_max_mm: 49,
            r_min_mm: 9.7,
            arm_length_mm: 140,
            drop_height_mm: 920,
            playback_speed: 0.25,
            insight: "The lower counterweight produces lower acceleration."
          }
        })
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).mass_g, 200);
});
