import { WordPoolModel, type WordLanguage } from "../models/word.model.js";

export const DEFAULT_FARSI_WORDS = [
  "آب",
  "آتش",
  "آسمان",
  "آرد",
  "آینه",
  "ابر",
  "ابریشم",
  "ادویه",
  "ارباب",
  "ارتباط",
  "ارز",
  "استاد",
  "اسفنج",
  "اسلام",
  "اشک",
  "اصفهان",
  "اعلان",
  "افق",
  "الگو",
  "الماس",
  "امواج",
  "انار",
  "انفجار",
  "ایران",
  "بازار",
  "باد",
  "باغ",
  "باران",
  "برگ",
  "برق",
  "بشقاب",
  "بلیت",
  "بلور",
  "بمب",
  "بنفشه",
  "بوستان",
  "بهار",
  "بیل",
  "پادشاه",
  "پارو",
  "پرتقال",
  "پروانه",
  "پسر",
  "پشت",
  "پلیس",
  "پنبه",
  "پوشاک",
  "پیاده",
  "پیچ",
  "تاریک",
  "تخته",
  "تجربه",
  "ترانه",
  "تسبیح",
  "تخت",
  "تکه",
  "تلفن",
  "تمشک",
  "تنوع",
  "توان",
  "تیر",
  "جاده",
  "جادو",
  "جارو",
  "جعبه",
  "جرقه",
  "جریان",
  "چای",
  "چرخ",
  "چمن",
  "چوب",
  "چوپان",
  "حافظ",
  "حلقه",
  "حمل",
  "حنا",
  "خاک",
  "خانواده",
  "خدا",
  "خروس",
  "خواب",
  "خرس",
  "خوب",
  "دانه",
  "درخت",
  "دریا",
  "دستگاه",
  "دوش",
  "دیوار",
  "رادیو",
  "راه",
  "رایانه",
  "رنگ",
  "روستا",
  "زبان",
  "زرد",
  "زمین",
  "زیبایی",
  "ساحل",
  "ساعت",
];

export const DEFAULT_ENGLISH_WORDS = [
  "apple",
  "beach",
  "bridge",
  "camp",
  "cabin",
  "candle",
  "cloud",
  "coffee",
  "corner",
  "crystal",
  "desert",
  "dragon",
  "forest",
  "garden",
  "glass",
  "gold",
  "harbor",
  "honey",
  "island",
  "jungle",
  "lantern",
  "library",
  "market",
  "meteor",
  "mountain",
  "needle",
  "night",
  "ocean",
  "orchard",
  "pearl",
  "planet",
  "rocket",
  "river",
  "sailor",
  "shadow",
  "silver",
  "solar",
  "spring",
  "stone",
  "sunset",
  "thunder",
  "turban",
  "velvet",
  "village",
  "water",
  "window",
  "winter",
  "yacht",
  "zebra",
  "amber",
  "arrow",
  "basket",
  "battle",
  "signal",
  "castle",
  "diamond",
  "engine",
  "falcon",
  "flight",
  "guitar",
  "helmet",
  "jacket",
  "kitchen",
  "leader",
  "meadow",
  "mirror",
  "native",
  "opal",
  "painter",
  "quartz",
  "rain",
  "singer",
  "throne",
  "travel",
  "violet",
  "wizard",
  "anchor",
  "breeze",
  "canvas",
  "copper",
  "dancer",
  "eagle",
  "fable",
  "hammer",
  "image",
  "jewel",
  "knight",
  "lemon",
  "magnet",
  "noble",
  "orbit",
  "parade",
  "quest",
  "raven",
  "trophy",
  "union",
  "voyage",
  "whistle",
  "xenon",
  "yellow",
  "zephyr",
  "atlas",
  "beacon",
  "crown",
  "drum",
  "ember",
  "feather",
  "galaxy",
  "harvest",
  "ivy",
  "joker",
  "lighthouse",
  "marble",
  "novel",
  "pencil",
  "quiver",
  "ranger",
  "sail",
  "timber",
  "umbra",
  "volcano",
  "wagon",
  "yonder",
  "zeal",
];

const FORBIDDEN_CHARS = /[<>]/g;
const WORD_SEPARATOR_REGEX = /[\n,;\r\t]+/g;

export interface WordPoolInput {
  name: string;
  language: WordLanguage;
  words: string[];
  isDefault?: boolean;
  adminKey?: string;
}

export function sanitizeWordEntry(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withoutTags = trimmed.replace(/<[^>]*>/gi, " ");
  const withoutBlockingTokens = withoutTags.replace(
    /(script|alert|javascript|on[a-z]+)[^\s]*/gi,
    " ",
  );
  const stripped = withoutBlockingTokens.replace(FORBIDDEN_CHARS, "").trim();

  return stripped.replace(/\s+/g, " ").trim();
}

export function normalizeWordInput(rawValue: string): string[] {
  if (!rawValue || !rawValue.trim()) {
    return [];
  }

  const words = rawValue
    .split(WORD_SEPARATOR_REGEX)
    .map((entry) => sanitizeWordEntry(entry))
    .filter((entry) => entry.length > 0);

  return [...new Set(words)];
}

export async function getWordPools() {
  return WordPoolModel.find().sort({ createdAt: -1 }).lean().exec();
}

export async function saveWordPool(input: WordPoolInput) {
  const safeName = input.name.trim();
  const safeWords = normalizeWordInput(input.words.join("\n")).slice(0, 500);

  if (!safeName) {
    throw new Error("Word pool name is required.");
  }

  if (safeWords.length < 25) {
    throw new Error("At least 25 words are required for a word pool.");
  }

  if (input.isDefault) {
    await WordPoolModel.updateMany(
      { language: input.language, isDefault: true },
      { $set: { isDefault: false } },
    ).exec();
  }

  const pool = await WordPoolModel.findOneAndUpdate(
    { name: safeName, language: input.language },
    {
      $set: {
        name: safeName,
        language: input.language,
        words: safeWords,
        isDefault: Boolean(input.isDefault),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();

  return pool;
}

export async function getWordPoolForGame(
  language: WordLanguage | string = "fa",
) {
  const normalizedLanguage: WordLanguage = language === "en" ? "en" : "fa";

  const savedPool = await WordPoolModel.findOne({
    language: normalizedLanguage,
    isDefault: true,
  })
    .lean()
    .exec();

  if (
    savedPool &&
    Array.isArray(savedPool.words) &&
    savedPool.words.length >= 25
  ) {
    return savedPool.words;
  }

  return normalizedLanguage === "en"
    ? DEFAULT_ENGLISH_WORDS
    : DEFAULT_FARSI_WORDS;
}
