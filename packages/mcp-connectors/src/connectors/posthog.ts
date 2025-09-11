import { mcpConnectorConfig } from "@stackone/mcp-config-types";
import { z } from "zod";

interface PostHogEvent {
	event: string;
	properties: Record<string, unknown>;
	distinct_id: string;
	timestamp?: string;
	uuid?: string;
}

interface PostHogEventResponse {
	status: number;
	results?: PostHogEvent[];
	count?: number;
	next?: string;
	previous?: string;
}

interface PostHogFeatureFlag {
	id: number;
	name: string;
	key: string;
	active: boolean;
	filters: Record<string, unknown>;
	rollout_percentage?: number;
	created_at: string;
	created_by?: {
		id: number;
		uuid: string;
		distinct_id: string;
		first_name: string;
		email: string;
	};
}

interface PostHogInsight {
	id: number;
	name: string;
	filters: Record<string, unknown>;
	query?: Record<string, unknown>;
	result?: unknown;
	created_at: string;
	created_by?: Record<string, unknown>;
}

interface PostHogCohort {
	id: number;
	name: string;
	description?: string;
	groups: unknown[];
	count?: number;
	is_calculating: boolean;
	created_at: string;
}

interface PostHogDashboard {
	id: number;
	name: string;
	description?: string;
	items: unknown[];
	created_at: string;
	created_by?: Record<string, unknown>;
}

interface PostHogPerson {
	id: string;
	name?: string;
	distinct_ids: string[];
	properties: Record<string, unknown>;
	created_at: string;
	uuid: string;
}

class PostHogClient {
	private projectApiKey?: string;
	private headers: {
		Authorization: string;
		"Content-Type": string;
	};
	private baseUrl: string;

	constructor(apiKey?: string, host: string = "https://eu.posthog.com", projectApiKey?: string) {
		this.projectApiKey = projectApiKey;
		this.headers = {
			Authorization: apiKey ? `Bearer ${apiKey}` : "",
			"Content-Type": "application/json",
		};
		this.baseUrl = host.endsWith("/") ? host.slice(0, -1) : host;
	}

	async captureEvent(
		event: string,
		distinctId: string,
		properties: Record<string, unknown> = {},
		timestamp?: string,
	): Promise<{ status: string }> {
		if (!this.projectApiKey) {
			throw new Error(
				"Project API Key is required for event capture. Please provide projectApiKey in credentials.",
			);
		}

		const payload = {
			api_key: this.projectApiKey,
			event,
			properties: {
				distinct_id: distinctId,
				...properties,
			},
			timestamp: timestamp || new Date().toISOString(),
		};

		const response = await fetch(`${this.baseUrl}/capture/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return { status: "success" };
	}

	async captureBatchEvents(
		events: PostHogEvent[],
	): Promise<{ status: string }> {
		if (!this.projectApiKey) {
			throw new Error(
				"Project API Key is required for batch event capture. Please provide projectApiKey in credentials.",
			);
		}

		const payload = {
			api_key: this.projectApiKey,
			batch: events.map((event) => ({
				...event,
				timestamp: event.timestamp || new Date().toISOString(),
			})),
		};

		const response = await fetch(`${this.baseUrl}/batch/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return { status: "success" };
	}

	async getEvents(limit = 50, offset = 0): Promise<PostHogEventResponse> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting events. Please provide apiKey in credentials.",
			);
		}

		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString(),
		});

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/events/?${params}`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<PostHogEventResponse>;
	}

	async getFeatureFlags(): Promise<PostHogFeatureFlag[]> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting feature flags. Please provide apiKey in credentials.",
			);
		}

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/feature_flags/`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		const result = (await response.json()) as { results: PostHogFeatureFlag[] };
		return result.results || [];
	}

	async createFeatureFlag(
		name: string,
		key: string,
		active = false,
		filters: Record<string, unknown> = {},
	): Promise<PostHogFeatureFlag> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for creating feature flags. Please provide apiKey in credentials.",
			);
		}

		const payload = {
			name,
			key,
			active,
			filters,
		};

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/feature_flags/`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<PostHogFeatureFlag>;
	}

	async evaluateFeatureFlag(
		key: string,
		distinctId: string,
		groups: Record<string, unknown> = {},
	): Promise<{ featureFlag: boolean | string }> {
		if (!this.projectApiKey) {
			throw new Error(
				"Project API Key is required for feature flag evaluation. Please provide projectApiKey in credentials.",
			);
		}

		const payload = {
			api_key: this.projectApiKey,
			distinct_id: distinctId,
			groups,
		};

		const response = await fetch(`${this.baseUrl}/decide/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		const result = (await response.json()) as {
			featureFlags?: Record<string, boolean | string>;
		};
		return { featureFlag: result.featureFlags?.[key] || false };
	}

	async getInsights(
		limit = 25,
		offset = 0,
	): Promise<{ results: PostHogInsight[] }> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting insights. Please provide apiKey in credentials.",
			);
		}

		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString(),
		});

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/insights/?${params}`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<{ results: PostHogInsight[] }>;
	}

	async createInsight(
		name: string,
		filters: Record<string, unknown>,
	): Promise<PostHogInsight> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for creating insights. Please provide apiKey in credentials.",
			);
		}

		const payload = {
			name,
			filters,
		};

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/insights/`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<PostHogInsight>;
	}

	async getCohorts(): Promise<PostHogCohort[]> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting cohorts. Please provide apiKey in credentials.",
			);
		}

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/cohorts/`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		const result = (await response.json()) as { results: PostHogCohort[] };
		return result.results || [];
	}

	async createCohort(
		name: string,
		groups: unknown[],
		description?: string,
	): Promise<PostHogCohort> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for creating cohorts. Please provide apiKey in credentials.",
			);
		}

		const payload = {
			name,
			groups,
			description,
		};

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/cohorts/`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<PostHogCohort>;
	}

	async getDashboards(): Promise<PostHogDashboard[]> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting dashboards. Please provide apiKey in credentials.",
			);
		}

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/dashboards/`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		const result = (await response.json()) as { results: PostHogDashboard[] };
		return result.results || [];
	}

	async createDashboard(
		name: string,
		description?: string,
	): Promise<PostHogDashboard> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for creating dashboards. Please provide apiKey in credentials.",
			);
		}

		const payload = {
			name,
			description,
		};

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/dashboards/`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<PostHogDashboard>;
	}

	async getPersons(
		limit = 100,
		offset = 0,
	): Promise<{ results: PostHogPerson[] }> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting persons. Please provide apiKey in credentials.",
			);
		}

		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString(),
		});

		const response = await fetch(
			`${this.baseUrl}/api/projects/@current/persons/?${params}`,
			{
				headers: this.headers,
			},
		);

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<{ results: PostHogPerson[] }>;
	}

	async identifyUser(
		distinctId: string,
		properties: Record<string, unknown> = {},
	): Promise<{ status: string }> {
		if (!this.projectApiKey) {
			throw new Error(
				"Project API Key is required for user identification. Please provide projectApiKey in credentials.",
			);
		}

		const payload = {
			api_key: this.projectApiKey,
			distinct_id: distinctId,
			properties,
		};

		const response = await fetch(`${this.baseUrl}/identify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return { status: "success" };
	}

	async getProjectInfo(): Promise<Record<string, unknown>> {
		if (!this.headers.Authorization) {
			throw new Error(
				"Personal API Key is required for getting project info. Please provide apiKey in credentials.",
			);
		}

		const response = await fetch(`${this.baseUrl}/api/projects/@current/`, {
			headers: this.headers,
		});

		if (!response.ok) {
			throw new Error(
				`PostHog API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as Promise<Record<string, unknown>>;
	}
}

export const PostHogConnectorConfig = mcpConnectorConfig({
	name: "PostHog",
	key: "posthog",
	version: "1.0.0",
	logo: "https://stackone-logos.com/api/posthog/filled/svg",
	credentials: z.object({
		apiKey: z
			.string()
			.optional()
			.describe(
				"PostHog Personal API Key (for admin operations) from Project Settings > API Keys :: phx_1234567890abcdef1234567890abcdef12345678901234567890abcdef123456789012 :: https://posthog.com/docs/api/overview#authentication",
			),
		projectApiKey: z
			.string()
			.optional()
			.describe(
				"PostHog Project API Key (for event capture) from Project Settings :: phc_1234567890abcdef1234567890abcdef12345678 :: Required only for event capture/identification",
			),
	}),
	setup: z.object({
		host: z
			.string()
			.default("https://eu.posthog.com")
			.describe(
				"PostHog host URL - Use https://us.posthog.com for US region, https://eu.posthog.com for EU region, or your self-hosted instance URL :: https://eu.posthog.com",
			),
	}),
	examplePrompt:
		"Capture a user signup event, check feature flag status, get recent events, create a new dashboard for tracking user engagement, and analyze user cohorts.",
	tools: (tool) => ({
		CAPTURE_EVENT: tool({
			name: "posthog_capture_event",
			description: "Capture a single event in PostHog",
			schema: z.object({
				event: z.string().describe("The name of the event to capture"),
				distinctId: z
					.string()
					.describe("Unique identifier for the user or device"),
				properties: z
					.record(z.unknown())
					.default({})
					.describe("Additional properties for the event"),
				timestamp: z
					.string()
					.optional()
					.describe("ISO 8601 timestamp (defaults to current time)"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.captureEvent(
						args.event,
						args.distinctId,
						args.properties,
						args.timestamp,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to capture event: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		CAPTURE_BATCH_EVENTS: tool({
			name: "posthog_capture_batch_events",
			description:
				"Capture multiple events in a single request for better performance",
			schema: z.object({
				events: z
					.array(
						z.object({
							event: z.string().describe("The name of the event"),
							distinctId: z
								.string()
								.describe("Unique identifier for the user or device"),
							properties: z
								.record(z.unknown())
								.default({})
								.describe("Additional properties for the event"),
							timestamp: z
								.string()
								.optional()
								.describe("ISO 8601 timestamp (defaults to current time)"),
						}),
					)
					.describe("Array of events to capture"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);

					const events = args.events.map((event) => ({
						event: event.event,
						distinct_id: event.distinctId,
						properties: event.properties,
						timestamp: event.timestamp,
					}));

					const response = await client.captureBatchEvents(events);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to capture batch events: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_EVENTS: tool({
			name: "posthog_get_events",
			description: "Retrieve events from PostHog",
			schema: z.object({
				limit: z
					.number()
					.default(50)
					.describe("Maximum number of events to return"),
				offset: z
					.number()
					.default(0)
					.describe("Number of events to skip for pagination"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getEvents(args.limit, args.offset);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get events: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		IDENTIFY_USER: tool({
			name: "posthog_identify_user",
			description: "Identify a user and set their properties",
			schema: z.object({
				distinctId: z.string().describe("Unique identifier for the user"),
				properties: z
					.record(z.unknown())
					.default({})
					.describe("Properties to set for the user (e.g., email, name, plan)"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.identifyUser(
						args.distinctId,
						args.properties,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to identify user: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_FEATURE_FLAGS: tool({
			name: "posthog_get_feature_flags",
			description: "Get all feature flags for the project",
			schema: z.object({}),
			handler: async (_, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getFeatureFlags();
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get feature flags: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		CREATE_FEATURE_FLAG: tool({
			name: "posthog_create_feature_flag",
			description: "Create a new feature flag",
			schema: z.object({
				name: z.string().describe("Display name for the feature flag"),
				key: z.string().describe("Unique key for the feature flag"),
				active: z
					.boolean()
					.default(false)
					.describe("Whether the flag is active"),
				filters: z
					.record(z.unknown())
					.default({})
					.describe("Filters to control who sees the feature"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.createFeatureFlag(
						args.name,
						args.key,
						args.active,
						args.filters,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to create feature flag: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		EVALUATE_FEATURE_FLAG: tool({
			name: "posthog_evaluate_feature_flag",
			description: "Evaluate a feature flag for a specific user",
			schema: z.object({
				key: z.string().describe("The key of the feature flag to evaluate"),
				distinctId: z.string().describe("Unique identifier for the user"),
				groups: z
					.record(z.unknown())
					.default({})
					.describe("Group properties for group-based feature flags"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.evaluateFeatureFlag(
						args.key,
						args.distinctId,
						args.groups,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to evaluate feature flag: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_INSIGHTS: tool({
			name: "posthog_get_insights",
			description: "Get insights and analytics from PostHog",
			schema: z.object({
				limit: z
					.number()
					.default(25)
					.describe("Maximum number of insights to return"),
				offset: z
					.number()
					.default(0)
					.describe("Number of insights to skip for pagination"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getInsights(args.limit, args.offset);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get insights: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		CREATE_INSIGHT: tool({
			name: "posthog_create_insight",
			description: "Create a new insight or analytics query",
			schema: z.object({
				name: z.string().describe("Name for the insight"),
				filters: z
					.record(z.unknown())
					.describe("Filter configuration for the insight"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.createInsight(args.name, args.filters);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to create insight: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_COHORTS: tool({
			name: "posthog_get_cohorts",
			description: "Get user cohorts for the project",
			schema: z.object({}),
			handler: async (_, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getCohorts();
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get cohorts: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		CREATE_COHORT: tool({
			name: "posthog_create_cohort",
			description: "Create a new user cohort",
			schema: z.object({
				name: z.string().describe("Name for the cohort"),
				groups: z
					.array(z.unknown())
					.describe("Group definitions for the cohort"),
				description: z
					.string()
					.optional()
					.describe("Optional description for the cohort"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.createCohort(
						args.name,
						args.groups,
						args.description,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to create cohort: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_DASHBOARDS: tool({
			name: "posthog_get_dashboards",
			description: "Get all dashboards for the project",
			schema: z.object({}),
			handler: async (_, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getDashboards();
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get dashboards: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		CREATE_DASHBOARD: tool({
			name: "posthog_create_dashboard",
			description: "Create a new dashboard",
			schema: z.object({
				name: z.string().describe("Name for the dashboard"),
				description: z
					.string()
					.optional()
					.describe("Optional description for the dashboard"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.createDashboard(
						args.name,
						args.description,
					);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to create dashboard: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_PERSONS: tool({
			name: "posthog_get_persons",
			description: "Get persons (users) from PostHog",
			schema: z.object({
				limit: z
					.number()
					.default(100)
					.describe("Maximum number of persons to return"),
				offset: z
					.number()
					.default(0)
					.describe("Number of persons to skip for pagination"),
			}),
			handler: async (args, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getPersons(args.limit, args.offset);
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get persons: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
		GET_PROJECT_INFO: tool({
			name: "posthog_get_project_info",
			description: "Get information about the current PostHog project",
			schema: z.object({}),
			handler: async (_, context) => {
				try {
					const { apiKey, projectApiKey } = await context.getCredentials();
					const { host } = await context.getSetup();
					const client = new PostHogClient(apiKey, host, projectApiKey);
					const response = await client.getProjectInfo();
					return JSON.stringify(response, null, 2);
				} catch (error) {
					return `Failed to get project info: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		}),
	}),
});
