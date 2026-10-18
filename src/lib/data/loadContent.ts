import type { Fact, Story, Language } from '$lib/types';

export async function loadFacts(language: Language): Promise<Fact[]> {
	const response = await fetch(`/api/facts?language=${language}`);
	if (!response.ok) throw new Error('facts load failed');
	const data = (await response.json()) as { facts: Fact[] };
	return data.facts;
}

export async function loadFact(id: string, language: Language): Promise<Fact | null> {
	const response = await fetch(`/api/facts/${id}?language=${language}`);
	if (response.status === 404) return null;
	if (!response.ok) throw new Error('fact load failed');
	const data = (await response.json()) as { fact: Fact };
	return data.fact;
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
