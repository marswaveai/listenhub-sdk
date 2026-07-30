/**
 * Build the multipart body for the voice-clone create endpoints.
 *
 * Scalars go over the wire as strings; the server's Joi converts them back
 * (`'true'` → `true`), so booleans must not be pre-encoded any other way.
 */
export function buildVoiceCloneForm(
	audioFiles: Blob[],
	audioFilenames: string[] | undefined,
	fields: Record<string, string | number | boolean | undefined>,
): FormData {
	const form = new FormData();

	audioFiles.forEach((file, index) => {
		form.append('audioFiles', file, audioFilenames?.[index] ?? `audio-${index + 1}.mp3`);
	});

	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null) continue;
		form.append(key, String(value));
	}

	return form;
}
