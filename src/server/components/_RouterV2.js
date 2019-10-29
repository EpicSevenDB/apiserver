import express from 'express';
import timeout from 'connect-timeout';
import Database from './Database';
import { asyncRoute, mountApiErrorResponse, mountApiResponse, shuffleArray } from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

const router = express.Router();

router.get(
	'/artifactjs',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const TIME_START = process.hrtime();

		try {
			const { lang: requestedLanguage = 'en' } = req.query;

			// TODO create lang checker method
			if (!['en', 'es', 'pt'].includes(requestedLanguage)) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			const translation = Database.getCollection(`text_${requestedLanguage}`);
			const collection = Database.getCollection('artifact');

			if (!collection || !translation) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			let artifactList = await collection
				.find()
				.project({ name: 1, rarity: 1, role: 1 })
				.sort({
					rarity: -1,
					name: 1,
				})
				.toArray();

			//get all name translation keys from all artifacts
			let translationKeys = artifactList.reduce((keyArray, artifactObject) => {
				if (artifactObject && artifactObject.name) {
					keyArray.push(artifactObject.name);
				}
				return keyArray;
			}, []);

			let artifactTranslation = await translation.find({ _id: { $in: translationKeys } }).toArray();

			artifactList.map((artifact) => {
				const realKey = artifactTranslation.find((translationKey) => translationKey._id === artifact.name);
				artifact.name = (realKey && realKey.text) || artifact.name;
			});

			const TIME_END = process.hrtime(TIME_START);
			console.info('Execution time (hr): %ds %dms', TIME_END[0], TIME_END[1] / 1000000);
			return mountApiResponse({}, res, null, artifactList);
		} catch (error) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}
	})
);

router.get(
	'/artifactdb',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const TIME_START = process.hrtime();

		try {
			const { lang: requestedLanguage = 'en' } = req.query;

			// TODO create lang checker method
			if (!['en', 'es', 'pt'].includes(requestedLanguage)) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			const translation = Database.getCollection(`text_${requestedLanguage}`);
			const collection = Database.getCollection('artifact');

			if (!collection || !translation) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			let artifactList = await collection
				.aggregate([
					{
						$project: { name: 1, rarity: 1, role: 1 },
					},
					{
						$lookup: {
							from: 'text_en',
							localField: 'name',
							foreignField: '_id',
							as: 'name',
						},
					},
					{
						$unwind: '$name',
					},
					{
						$addFields: {
							name: '$name.text',
						},
					},
				])
				.sort({
					rarity: -1,
					name: 1,
				});

			return await artifactList.toArray((...args) => {
				const TIME_END = process.hrtime(TIME_START);
				console.info('Execution time (hr): %ds %dms', TIME_END[0], TIME_END[1] / 1000000);
				mountApiResponse(artifactList, res, ...args);
			});
		} catch (error) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}
	})
);

export default router;
