import type { Fact, Story, Language } from '$lib/types';

export async function loadFacts(language: Language): Promise<Fact[]> {
	const response = await fetch(`/content/facts/${language}/index.json`);
	if (!response.ok) return [];
	return response.json();
}

export async function loadFact(id: string, language: Language): Promise<Fact | null> {
	const facts = await loadFacts(language);
	return facts.find((f) => f.id === id) ?? null;
}

export async function loadStories(language: Language): Promise<Story[]> {
	const response = await fetch(`/content/stories/${language}/index.json`);
	if (!response.ok) return [];
	return response.json();
}

export async function loadStory(id: string, language: Language): Promise<Story | null> {
	const response = await fetch(`/content/stories/${language}/${id}.json`);
	if (!response.ok) return null;
	return response.json();
}
