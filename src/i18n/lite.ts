import { computed, ref } from "vue";
import {
	enMessages,
	type TranslationKey,
	type LocaleMessageSchema,
} from "./locales/en";

export type LocaleCode = "en" | "th";
export type FrontmatterTranslatableKey = "title" | "description";

const STORAGE_KEY = "akari-docs.locale";
const messageCache: Partial<Record<LocaleCode, LocaleMessageSchema>> = {
	en: enMessages,
};

function isLocaleCode(value: string | null): value is LocaleCode {
	return value === "en" || value === "th";
}

async function loadLocaleMessages(targetLocale: LocaleCode): Promise<void> {
	if (messageCache[targetLocale]) {
		return;
	}

	if (targetLocale === "th") {
		const module = await import("./locales/th");
		messageCache.th = module.thMessages;
		return;
	}

	messageCache.en = enMessages;
}

function getBrowserLocale(): LocaleCode {
	if (typeof navigator === "undefined") {
		return "en";
	}

	const language = navigator.language.toLowerCase();
	return language.startsWith("th") ? "th" : "en";
}

function resolveInitialLocale(): LocaleCode {
	if (typeof window === "undefined") {
		return "en";
	}

	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (isLocaleCode(stored)) {
		return stored;
	}

	return getBrowserLocale();
}

const locale = ref<LocaleCode>(resolveInitialLocale());
const isLocaleReady = ref(false);

const activeMessages = computed<LocaleMessageSchema>(() => {
	return messageCache[locale.value] ?? enMessages;
});

const t = (key: TranslationKey): string => {
	return activeMessages.value[key] ?? enMessages[key];
};

const setLocale = async (nextLocale: LocaleCode): Promise<void> => {
	locale.value = nextLocale;
	await loadLocaleMessages(nextLocale);
	isLocaleReady.value = true;

	if (typeof window !== "undefined") {
		window.localStorage.setItem(STORAGE_KEY, nextLocale);
	}
};

const toggleLocale = async (): Promise<void> => {
	await setLocale(locale.value === "en" ? "th" : "en");
};

const localeLabel = computed(() => locale.value.toUpperCase());

const ensureLocaleLoaded = async (): Promise<void> => {
	await loadLocaleMessages(locale.value);
	isLocaleReady.value = true;
};

const getOptionalTranslatedFrontmatter = (
	frontmatter: Readonly<Record<string, unknown>> | undefined,
	key: FrontmatterTranslatableKey,
): string | undefined => {
	if (!frontmatter) {
		return undefined;
	}

	const localizedValue = frontmatter[`${key}_${locale.value}`];
	if (typeof localizedValue === "string" && localizedValue.trim().length > 0) {
		return localizedValue;
	}

	const fallbackValue = frontmatter[key];
	if (typeof fallbackValue === "string" && fallbackValue.trim().length > 0) {
		return fallbackValue;
	}

	return undefined;
};

void ensureLocaleLoaded();

export function useLiteI18n() {
	return {
		locale,
		localeLabel,
		isLocaleReady,
		t,
		setLocale,
		toggleLocale,
		ensureLocaleLoaded,
		isLocaleCode,
		getOptionalTranslatedFrontmatter,
	};
}
