import { UserModel } from "../models/user.model.js";
import { env } from "../config/env.js";

/**
 * Generate a stylized avatar (Ghibli-inspired) for a user photo.
 * This is a thin wrapper around an external image-generation provider.
 *
 * Note: To actually enable generation, set `AVATAR_PROVIDER` and the
 * corresponding API key (eg. `REPLICATE_API_TOKEN`) in the server env.
 */
export async function generateGhibliAvatarFromUrl(
  telegramId: number,
  sourcePhotoUrl: string,
): Promise<string | null> {
  if (!env.AVATAR_PROVIDER) {
    console.debug("Avatar provider not configured, skipping generation");
    return null;
  }

  // Example: Replicate img2img or custom model integration.
  if (env.AVATAR_PROVIDER === "replicate" && env.REPLICATE_API_TOKEN) {
    try {
      const prompt =
        "Create a portrait avatar from the provided photo URL in a gentle, hand-painted, Studio-Ghibli-inspired style — soft colors, expressive eyes, and subtle textures. Do not copy any copyrighted artwork directly. Output a square PNG.";

      // POST prediction to Replicate
      // @ts-ignore: Node global fetch may not be typed in this TS config.
      const postRes = await (globalThis as any).fetch(
        "https://api.replicate.com/v1/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: env.REPLICATE_MODEL_VERSION,
            input: {
              image: sourcePhotoUrl,
              prompt,
            },
          }),
        },
      );

      if (!postRes.ok) {
        const txt = await postRes.text();
        console.debug("Replicate POST failed", txt);
        return null;
      }

      const postPayload = await postRes.json();
      const predictionId: string | undefined = postPayload?.id;

      if (!predictionId) {
        // Some models may return output immediately; try to read output
        const immediateOutput = postPayload?.output?.[0] ?? null;
        if (immediateOutput) {
          await UserModel.findOneAndUpdate(
            { telegramId },
            { ghibliAvatarUrl: immediateOutput },
            { new: true },
          ).exec();
          return immediateOutput;
        }
        console.debug("Replicate response missing prediction id", postPayload);
        return null;
      }

      // Poll prediction status until succeeded or failed
      const maxAttempts = 20;
      let attempt = 0;
      let outputUrl: string | null = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        // Wait with exponential backoff between polls
        const delayMs = Math.min(5000 * Math.pow(1.5, attempt - 1), 30000);
        // @ts-ignore
        const getRes = await (globalThis as any).fetch(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
            },
          },
        );

        if (!getRes.ok) {
          const t = await getRes.text();
          console.debug("Replicate GET failed", t);
          // wait and retry
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        const statusPayload = await getRes.json();
        const status = statusPayload?.status;
        if (status === "succeeded") {
          outputUrl = statusPayload?.output?.[0] ?? null;
          break;
        }

        if (status === "failed") {
          console.debug("Replicate prediction failed", statusPayload);
          break;
        }

        // not finished yet, wait and loop
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }

      if (!outputUrl) return null;

      // Persist generated avatar URL on the user record for caching.
      await UserModel.findOneAndUpdate(
        { telegramId },
        { ghibliAvatarUrl: outputUrl },
        { new: true },
      ).exec();

      return outputUrl;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug("generateGhibliAvatarFromUrl failed", e);
      return null;
    }
  }

  // Other providers could be added here.

  return null;
}

export async function clearGhibliAvatar(telegramId: number) {
  await UserModel.findOneAndUpdate(
    { telegramId },
    { ghibliAvatarUrl: null },
  ).exec();
}
