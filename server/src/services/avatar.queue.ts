import { env } from "../config/env.js";
import { generateGhibliAvatarFromUrl } from "./avatar.service.js";

type Task = {
  telegramId: number;
  photoUrl: string;
  attempts: number;
  resolve: (value: string | null) => void;
  reject: (err: any) => void;
};

const queue: Task[] = [];
let active = 0;

const CONCURRENCY = Number(env.AVATAR_CONCURRENCY ?? 3);
const MAX_RETRIES = Number(env.AVATAR_MAX_RETRIES ?? 3);
const BASE_DELAY_MS = Number(env.AVATAR_BASE_DELAY_MS ?? 1000);

function scheduleProcess() {
  // kick the loop asynchronously
  setImmediate(processNext);
}

function backoffDelay(attempts: number) {
  // exponential backoff with jitter
  const expo = Math.pow(2, attempts - 1);
  const jitter = Math.floor(Math.random() * 200);
  return BASE_DELAY_MS * expo + jitter;
}

async function processNext() {
  if (active >= CONCURRENCY) return;
  const task = queue.shift();
  if (!task) return;
  active++;

  try {
    const result = await generateGhibliAvatarFromUrl(
      task.telegramId,
      task.photoUrl,
    );
    task.resolve(result);
  } catch (err) {
    // If we still have retries left, requeue with backoff delay
    task.attempts += 1;
    if (task.attempts <= MAX_RETRIES) {
      const delay = backoffDelay(task.attempts);
      // requeue after delay
      setTimeout(() => {
        queue.unshift(task);
        scheduleProcess();
      }, delay);
    } else {
      task.reject(err);
    }
  } finally {
    active--;
    // continue processing
    scheduleProcess();
  }
}

export function enqueueGhibliAvatarGeneration(
  telegramId: number,
  photoUrl: string,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const t: Task = { telegramId, photoUrl, attempts: 0, resolve, reject };
    queue.push(t);
    scheduleProcess();
  });
}

export function queueStatus() {
  return { pending: queue.length, active: active, concurrency: CONCURRENCY };
}
