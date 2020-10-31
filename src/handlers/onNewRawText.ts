import { S3CreateEvent } from 'aws-lambda';
import { comprehend, logger, s3 } from '../helpers';

export const handler = async (event: S3CreateEvent) => {
	logger.info({ event });

	for (const record of event.Records) {
		const key = record.s3.object.key;

		const data = await s3
			.getObject({
				Bucket: process.env.SERVICE_NAME! + '-raw-text',
				Key: key
			})
			.promise();

		logger.info({ data });

		comprehend
			.startKeyPhrasesDetectionJob({
				JobName: 'podcast-keywords',
				LanguageCode: 'en',
				DataAccessRoleArn: process.env.COMPREHEND_ROLE_ARN!,
				InputDataConfig: {
					S3Uri: process.env.RAW_TEXT_BUCKET_URI! + key,
					InputFormat: 'ONE_DOC_PER_FILE'
				},
				OutputDataConfig: {
					S3Uri: process.env.RAW_KEYWORD_BUCKET_URI! + key
				}
			})
			.promise();
	}

	return;
};
