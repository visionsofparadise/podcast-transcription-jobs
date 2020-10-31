import spawnLogger from 'envlog';
import AWS from 'aws-sdk';

export const isTest = !process.env.JEST_WORKER_ID;

export const s3 = new AWS.S3();
export const comprehend = new AWS.Comprehend();
export const transcribeService = new AWS.TranscribeService();

export const logger = spawnLogger({
	envKey: 'XLH_LOGS',
	onValue: 'true'
});
