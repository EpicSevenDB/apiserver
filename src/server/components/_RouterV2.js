import express from 'express';
import timeout from 'connect-timeout';
import Database from './Database';
import {
	asyncRoute,
	mountApiErrorResponse,
	mountApiResponse,
	shuffleArray,
	cLog,
	getDateNow,
	assignDefined,
	getCurrentLanguage,
} from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

const router = express.Router();

// log requests
router.use(function(req, res, next) {
	cLog('log', `${getDateNow()} :: ${req.ip} REQ: ${req.originalUrl} || REF: ${req.get('Referrer')}`);
	next();
});

router.get(
	'/artifactjs',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const TIME_START = process.hrtime();

		try {
			const requestedLanguage = getCurrentLanguage(req);
			const translationEnglish = Database.getCollection(`text_en`);
			let translationOther;
			if (requestedLanguage !== 'en') {
				translationOther = Database.getCollection(`text_${requestedLanguage}`);
			}
			const collection = Database.getCollection('artifact');

			if (!collection || !translationEnglish) {
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

			let artifactTranslationEngObj = {};
			let artifactTranslationOtherObj = {};

			await translationEnglish
				.find({ _id: { $in: translationKeys } })
				.forEach((translation) => (artifactTranslationEngObj[translation._id] = translation.text));
			if (translationOther) {
				await translationOther
					.find({ _id: { $in: translationKeys } })
					.forEach((translation) => (artifactTranslationOtherObj[translation._id] = translation.text));
			}

			let finalTranslations = assignDefined({}, artifactTranslationEngObj, artifactTranslationOtherObj);

			artifactList.forEach((artifact) => {
				const realKey = finalTranslations[artifact.name];
				artifact.name = realKey || artifact.name;
			});

			const TIME_END = process.hrtime(TIME_START);
			console.info('Execution time (hr): %ds %dms', TIME_END[0], TIME_END[1] / 1000000);
			return mountApiResponse({}, res, null, artifactList);
		} catch (error) {
			console.error(error.stack);
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
			const requestedLanguage = getCurrentLanguage(req);
			const translationCollection = `text_${requestedLanguage}`;
			const collection = Database.getCollection('artifact');

			if (!collection || !translationCollection) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			let artifactList = await collection
				.aggregate([
					{
						$project: { name: 1, rarity: 1, role: 1 },
					},
					{
						$lookup: {
							from: translationCollection,
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
				})
				.toArray((...args) => {
					const TIME_END = process.hrtime(TIME_START);
					console.info('Execution time (hr): %ds %dms', TIME_END[0], TIME_END[1] / 1000000);
					mountApiResponse(artifactList, res, ...args);
				});
		} catch (error) {
			console.error(error.stack);
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}
	})
);

export default router;
