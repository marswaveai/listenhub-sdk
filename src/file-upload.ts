import type {KyInstance} from './client.js';
import type {
	CreateFileUploadParams,
	CreateFileUploadResponse,
	UploadFileData,
	UploadFileParams,
} from './types/files.js';

function isBlob(value: UploadFileData): value is Blob {
	return typeof Blob !== 'undefined' && value instanceof Blob;
}

export function getUploadFileSize(file: UploadFileData): number | undefined {
	if (isBlob(file)) return file.size;
	if (file instanceof ArrayBuffer) return file.byteLength;
	if (ArrayBuffer.isView(file)) return file.byteLength;
	return undefined;
}

function getUploadFileName(params: UploadFileParams): string {
	if (params.fileName) return params.fileName;
	const fileName = (params.file as {name?: unknown}).name;
	if (typeof fileName === 'string' && fileName.length > 0) return fileName;
	throw new Error('uploadFile requires fileName when file is not a browser File');
}

function getUploadContentType(params: UploadFileParams): string {
	if (params.contentType) return params.contentType;
	const contentType = isBlob(params.file) ? params.file.type : undefined;
	if (contentType) return contentType;
	throw new Error('uploadFile requires contentType when file does not include a type');
}

function toBodyInit(file: UploadFileData): BodyInit {
	if (isBlob(file)) return file;
	if (file instanceof ArrayBuffer) return file;
	if (ArrayBuffer.isView(file)) return file;
	throw new Error('Unsupported upload file data');
}

export async function createFileUpload(
	api: KyInstance,
	params: CreateFileUploadParams,
): Promise<CreateFileUploadResponse> {
	return api.post('v1/files', {json: params}).json<CreateFileUploadResponse>();
}

export async function uploadFile(
	api: KyInstance,
	params: UploadFileParams,
): Promise<CreateFileUploadResponse> {
	const fileName = getUploadFileName(params);
	const contentType = getUploadContentType(params);
	const upload = await createFileUpload(api, {
		fileKey: fileName,
		contentType,
		category: params.category ?? 'episode',
	});

	const response = await fetch(upload.presignedUrl, {
		method: 'PUT',
		body: toBodyInit(params.file),
		headers: {'Content-Type': contentType},
	});

	if (!response.ok) {
		throw new Error(`Upload failed: ${String(response.status)} ${response.statusText}`);
	}

	return upload;
}
