import { S3CreateEvent } from 'aws-lambda';
import { logger, s3 } from '../helpers';

interface RawTranscription {
	results: {
		transcripts: Array<{
			transcript: string;
		}>;
		items: Array<{
			start_time: string;
			end_time: string;
			type: 'pronunciation' | 'punctuation';
			alternatives: Array<{
				content: string;
				confidence: string;
			}>;
		}>;
	};
}

export const handler = async (event: S3CreateEvent) => {
	logger.info({ event });

	for (const record of event.Records) {
		const key = record.s3.object.key;

		const data = await s3
			.getObject({
				Bucket: process.env.SERVICE_NAME! + '-raw-transcriptions',
				Key: key
			})
			.promise();

		logger.info({ data });

		const body = JSON.parse(data.Body as string) as RawTranscription;

		logger.info({ body });

		const rawText = body.results.transcripts[0].transcript;

		s3.putObject({
			Bucket: process.env.SERVICE_NAME! + '-raw-text',
			Key: key,
			Body: rawText
		}).promise();

		let formattedText = '';
		let wasPunctuation: boolean = false;

		for (const item of body.results.items) {
			if (parseInt(item.alternatives[0].confidence) < 0.5) return;

			if (item.type === 'punctuation') {
				formattedText += item.alternatives[0].content + `\n\n`;
				wasPunctuation = true;

				return;
			}

			const timecode = item.start_time;
			const content = item.alternatives[0].content;

			formattedText += wasPunctuation ? timecode + ' ' + content + ' ' : content + ' ';
			wasPunctuation = false;

			return;
		}

		s3.putObject({
			Bucket: process.env.SERVICE_NAME! + '-transcriptions',
			Key: key,
			Body: formattedText
		}).promise();
	}

	return;
};
