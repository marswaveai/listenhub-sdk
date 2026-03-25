export interface ConnectInitResponse {
	sessionId: string;
	authUrl: string;
}

export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface StoredCredentials {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	apiKey?: string;
}

export interface LogoutResult {
	serverRevoked: boolean;
	localCleared: boolean;
	warning?: string;
}
