// Import all connector metadata using namespace imports
import * as asana from './connectors/asana';
import * as attio from './connectors/attio';
import * as aws from './connectors/aws';
import * as datadog from './connectors/datadog';
import * as duckduckgo from './connectors/duckduckgo';
import * as deel from './connectors/deel';
import * as deepseek from './connectors/deepseek';
import * as documentation from './connectors/documentation';
import * as elevenlabs from './connectors/elevenlabs';
import * as exa from './connectors/exa';
import * as fal from './connectors/fal';
import * as fireflies from './connectors/fireflies';
import * as github from './connectors/github';
import * as gitlab from './connectors/gitlab';
import * as googleDrive from './connectors/google-drive';
import * as googleMaps from './connectors/google-maps';
import * as graphy from './connectors/graphy';
import * as hibob from './connectors/hibob';
import * as hubspot from './connectors/hubspot';
import * as incident from './connectors/incident';
import * as jira from './connectors/jira';
import * as langsmith from './connectors/langsmith';
import * as linear from './connectors/linear';
import * as linkedin from './connectors/linkedin';
import * as modal from './connectors/modal';
import * as notion from './connectors/notion';
import * as onepassword from './connectors/onepassword';
import * as perplexity from './connectors/perplexity';
import * as parallel from './connectors/parallel';
import * as posthog from './connectors/posthog';
import * as producthunt from './connectors/producthunt';
import * as pydanticLogfire from './connectors/pydantic-logfire';
import * as pylon from './connectors/pylon';
import * as replicate from './connectors/replicate';
import * as retool from './connectors/retool';
import * as ridewithgps from './connectors/ridewithgps';
import * as sequentialThinking from './connectors/sequential-thinking';
import * as slack from './connectors/slack';
import * as stackone from './connectors/stackone';
import * as strava from './connectors/strava';
import * as supabase from './connectors/supabase';
import * as test from './connectors/test';
import * as tfl from './connectors/tfl';
import * as tinybird from './connectors/tinybird';
import * as todoist from './connectors/todoist';
import * as todolist from './connectors/todolist';
import * as turbopuffer from './connectors/turbopuffer';
import * as wandb from './connectors/wandb';
import * as xero from './connectors/xero';
import * as zapier from './connectors/zapier';

// Aggregate all connector metadata
export const ConnectorMetadata = {
	asana: asana.AsanaConnectorMetadata,
	attio: attio.AttioConnectorMetadata,
	aws: aws.AwsConnectorMetadata,
	datadog: datadog.DatadogConnectorMetadata,
	duckduckgo: duckduckgo.DuckduckgoConnectorMetadata,
	deel: deel.DeelConnectorMetadata,
	deepseek: deepseek.DeepseekConnectorMetadata,
	documentation: documentation.DocumentationConnectorMetadata,
	elevenlabs: elevenlabs.ElevenlabsConnectorMetadata,
	exa: exa.ExaConnectorMetadata,
	fal: fal.FalConnectorMetadata,
	fireflies: fireflies.FirefliesConnectorMetadata,
	github: github.GithubConnectorMetadata,
	gitlab: gitlab.GitlabConnectorMetadata,
	'google-drive': googleDrive.GoogleDriveConnectorMetadata,
	'google-maps': googleMaps.GoogleMapsConnectorMetadata,
	graphy: graphy.GraphyConnectorMetadata,
	hibob: hibob.HibobConnectorMetadata,
	hubspot: hubspot.HubspotConnectorMetadata,
	incident: incident.IncidentConnectorMetadata,
	jira: jira.JiraConnectorMetadata,
	langsmith: langsmith.LangsmithConnectorMetadata,
	linear: linear.LinearConnectorMetadata,
	linkedin: linkedin.LinkedinConnectorMetadata,
	modal: modal.ModalConnectorMetadata,
	notion: notion.NotionConnectorMetadata,
	onepassword: onepassword.OnepasswordConnectorMetadata,
	perplexity: perplexity.PerplexityConnectorMetadata,
	parallel: parallel.ParallelConnectorMetadata,
	posthog: posthog.PosthogConnectorMetadata,
	producthunt: producthunt.ProducthuntConnectorMetadata,
	'pydantic-logfire': pydanticLogfire.PydanticLogfireConnectorMetadata,
	pylon: pylon.PylonConnectorMetadata,
	replicate: replicate.ReplicateConnectorMetadata,
	retool: retool.RetoolConnectorMetadata,
	ridewithgps: ridewithgps.RidewithgpsConnectorMetadata,
	stackone: stackone.StackoneConnectorMetadata,
	slack: slack.SlackConnectorMetadata,
	'sequential-thinking': sequentialThinking.SequentialThinkingConnectorMetadata,
	strava: strava.StravaConnectorMetadata,
	supabase: supabase.SupabaseConnectorMetadata,
	tfl: tfl.TflConnectorMetadata,
	tinybird: tinybird.TinybirdConnectorMetadata,
	todoist: todoist.TodoistConnectorMetadata,
	todolist: todolist.TodolistConnectorMetadata,
	test: test.TestConnectorMetadata,
	turbopuffer: turbopuffer.TurbopufferConnectorMetadata,
	wandb: wandb.WandbConnectorMetadata,
	xero: xero.XeroConnectorMetadata,
	zapier: zapier.ZapierConnectorMetadata,
} as const;

export type ConnectorKey = keyof typeof ConnectorMetadata;

// Export as array for easy iteration
export const AllConnectorMetadata = Object.values(ConnectorMetadata);
