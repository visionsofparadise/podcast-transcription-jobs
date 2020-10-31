import { S3CreateEvent } from 'aws-lambda';
import { transcribeService } from '../helpers';

export const handler = async (event: S3CreateEvent) => {
	for (const record of event.Records) {
		const keys = record.s3.object.key;

		const [folder, key] = keys.split('/');

		transcribeService
			.startTranscriptionJob({
				TranscriptionJobName: 'podcast-transcription',
				Settings: {
					ShowSpeakerLabels: true,
					MaxSpeakerLabels: parseInt(folder)
				},
				MediaFormat: 'mp3',
				Media: {
					MediaFileUri: process.env.SOURCE_BUCKET_URI! + keys
				},
				OutputBucketName: process.env.SERVICE_NAME! + '-raw-transcriptions',
				OutputKey: key
			})
			.promise();
	}

	return;
};
