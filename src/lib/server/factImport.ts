import type { FactRecord, FactScene } from '$lib/types';
import { parseFactJson } from '$lib/server/factParse';
import { SCENE_CATALOG, isKnownScene } from '$lib/scenes/catalog';

/**
 * Import a hand-written (or Claude-written) fact without calling OpenAI.
 *
 * The words go through parseFactJson — the exact validator a generated fact faces — so an
 * imported fact cannot have a shape the kid screens don't expect. The only additions are
 * an optional stable id and an optional animated scene, checked against the scene
 * catalog so a misspelt scene or layer is refused here rather than drawing nothing.
 *
 * Pure: no I/O. The route decides the id collision and does the insert.
 */

/** Same alphabet as the existing hand-made id "fact-001", so ids stay URL-safe. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,59}$/;

export type ImportOk = { ok: true; fact: FactRecord };
export type ImportErr = { ok: false; message: string };

export function parseFactImport(
	raw: string,
	opts: { newId: () => string; now: () => string }
): ImportOk | ImportErr {
	const err = (message: string): ImportErr => ({ ok: false, message });

	let obj: Record<string, unknown>;
	try {
		const parsed = JSON.parse(raw);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return err('The JSON must be one object, starting with {.');
		}
		obj = parsed as Record<string, unknown>;
	} catch {
		return err('That is not valid JSON. Check for a missing comma or quote.');
	}

	let words;
	try {
		words = parseFactJson(raw);
	} catch (e) {
		// parseFactJson's messages are written for a model reply; they read fine for a
		// paste too, apart from the prefix.
		return err((e instanceof Error ? e.message : 'Invalid fact.').replace(/^Fact JSON/, 'The fact'));
	}

	let id = opts.newId();
	if (obj.id !== undefined && obj.id !== '') {
		const wanted = String(obj.id).trim();
		if (!ID_PATTERN.test(wanted)) {
			return err('The id may use only lowercase letters, numbers and dashes (3 to 60 characters).');
		}
		id = wanted;
	}

	let scene: FactScene | undefined;
	if (obj.scene !== undefined && obj.scene !== null) {
		const s = obj.scene as { id?: unknown; section_layers?: unknown };
		const sceneId = String(s?.id ?? '').trim();
		if (!isKnownScene(sceneId)) {
			const known = Object.keys(SCENE_CATALOG).join(', ');
			return err(`Unknown scene "${sceneId}". Scenes that exist: ${known}.`);
		}
		const allowed = SCENE_CATALOG[sceneId].layers;
		const layers = s.section_layers;
		if (!Array.isArray(layers) || layers.length !== words.structure.length) {
			return err(
				`The scene needs one layer list per section: ${words.structure.length} expected, ` +
					`${Array.isArray(layers) ? layers.length : 0} given.`
			);
		}
		const sectionLayers: string[][] = [];
		for (let i = 0; i < layers.length; i++) {
			const row = layers[i];
			if (!Array.isArray(row)) return err(`Scene layers for section ${i + 1} must be a list.`);
			const names = row.map((x) => String(x).trim()).filter(Boolean);
			const bad = names.find((n) => !allowed.includes(n));
			if (bad) {
				return err(`Section ${i + 1} uses layer "${bad}", which ${sceneId} does not have. Layers: ${allowed.join(', ')}.`);
			}
			sectionLayers.push([...new Set(names)]);
		}
		scene = { id: sceneId, section_layers: sectionLayers };
	}

	const fact: FactRecord = {
		id,
		type: 'nature_fact',
		topic: words.topic,
		age_range: '5-8',
		// Always a draft: an import is reviewed and published from /admin/facts like
		// every generated fact, so nothing reaches a child unread.
		status: 'draft',
		cover_image_url: '',
		...(words.cover_prompt ? { cover_prompt: words.cover_prompt } : {}),
		section_images: words.structure.map(() => ''),
		structure: words.structure,
		content: words.content,
		...(scene ? { scene } : {}),
		created_at: opts.now()
	};

	return { ok: true, fact };
}
