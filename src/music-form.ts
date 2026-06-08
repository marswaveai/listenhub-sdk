/** Append a defined scalar field to FormData, stringifying numbers/booleans. */
export function appendMusicField(
	form: FormData,
	key: string,
	value: string | number | boolean | undefined,
): void {
	if (value === undefined || value === null) return;
	form.append(key, String(value));
}
