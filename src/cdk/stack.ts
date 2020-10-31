import { App, Construct, Duration, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { Bucket, EventType } from '@aws-cdk/aws-s3';
import path from 'path';
import { Function, Code, Runtime } from '@aws-cdk/aws-lambda';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export class PodcastTranscriptionStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const serviceName = 'ft-podcast-transcription';

		const bucketDefaults = {
			removalPolicy: RemovalPolicy.DESTROY,
			lifecycleRules: [{ expiration: Duration.days(30), enabled: true }]
		};

		const sourceBucket = new Bucket(this, 'SourceBucket', {
			...bucketDefaults,
			bucketName: serviceName + '-sources'
		});

		const rawBucket = new Bucket(this, 'RawTranscriptionBucket', {
			...bucketDefaults,
			bucketName: serviceName + '-raw-transcriptions'
		});

		const rawTextBucket = new Bucket(this, 'RawTextBucket', {
			...bucketDefaults,
			bucketName: serviceName + '-raw-text'
		});

		const rawKeywordBucket = new Bucket(this, 'RawKeywordExtractionBucket', {
			...bucketDefaults,
			bucketName: serviceName + '-raw-keywords'
		});

		// const keywordBucket = new Bucket(this, 'KeywordExtractionBucket', {
		// 	...bucketDefaults,
		// 	bucketName: serviceName + '-keywords'
		// });

		const transcriptionBucket = new Bucket(this, 'TranscriptionBucket', {
			...bucketDefaults,
			bucketName: serviceName + '-transcriptions'
		});

		const comprehendRole = new Role(this, 'Role', {
			assumedBy: new ServicePrincipal('comprehend.amazonaws.com')
		});

		comprehendRole.addToPolicy(
			new PolicyStatement({
				resources: [rawTextBucket.bucketArn],
				actions: ['s3:GetObject']
			})
		);

		const environment = {
			SERVICE_NAME: serviceName,
			SOURCE_BUCKET_URI: sourceBucket.urlForObject(),
			RAW_TRANSCRIPTION_BUCKET_URI: rawBucket.urlForObject(),
			RAW_TEXT_BUCKET_URI: rawTextBucket.urlForObject(),
			RAW_KEYWORD_BUCKET_URI: rawKeywordBucket.urlForObject(),
			COMPREHEND_ROLE_ARN: comprehendRole.roleArn
		};

		const lambdaDefaults = {
			runtime: Runtime.NODEJS_10_X,
			code: Code.fromAsset(path.join(__dirname, '../../build')),
			environment
		};

		const onNewSourceHandler = new Function(this, 'onNewSourceHandler', {
			...lambdaDefaults,
			handler: 'onNewSource.handler'
		});

		sourceBucket.grantRead(onNewSourceHandler.grantPrincipal);

		onNewSourceHandler.addEventSource(
			new S3EventSource(sourceBucket, {
				events: [EventType.OBJECT_CREATED]
			})
		);

		const onNewRawTranscriptionHandler = new Function(this, 'onNewRawTranscriptionHandler', {
			...lambdaDefaults,
			handler: 'onNewRawTranscription.handler'
		});

		rawBucket.grantRead(onNewRawTranscriptionHandler);
		rawTextBucket.grantWrite(onNewRawTranscriptionHandler);
		transcriptionBucket.grantWrite(onNewRawTranscriptionHandler);

		onNewRawTranscriptionHandler.addEventSource(
			new S3EventSource(rawBucket, {
				events: [EventType.OBJECT_CREATED]
			})
		);

		const onNewRawTextHandler = new Function(this, 'onNewRawTextHandler', {
			...lambdaDefaults,
			handler: 'onNewRawText.handler'
		});

		rawTextBucket.grantRead(onNewRawTextHandler);

		onNewRawTextHandler.addEventSource(
			new S3EventSource(rawTextBucket, {
				events: [EventType.OBJECT_CREATED]
			})
		);
	}
}

const app = new App();

new PodcastTranscriptionStack(app, 'podcast-transcription-stack', {});

app.synth();
