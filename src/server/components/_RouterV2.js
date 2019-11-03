import express from 'express';
import timeout from 'connect-timeout';
import Database from './Database';
import {
	asyncRoute,
	mountApiErrorResponse,
	mountApiResponse,
	shuffleArray,
	getCurrentLanguage,
	cLog,
	getDateNow,
	nodeTimer,
} from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

const router = express.Router();

// log requests
router.use(function(req, res, next) {
	cLog('log', `${getDateNow()} :: ${req.ip} REQ: ${req.originalUrl} || REF: ${req.get('Referrer')}`);
	next();
});

// router.get(
// 	'/artifactjs',
// 	timeout('15s'),
// 	asyncRoute(async (req, res, next) => {
// 		const TIME_START = process.hrtime();

// 		try {
// 			const requestedLanguage = getCurrentLanguage(req);
// 			const translation = Database.getCollection(`text_${requestedLanguage}`);
// 			const collection = Database.getCollection('artifact');

// 			if (!collection || !translation) {
// 				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
// 			}

// 			let artifactList = await collection
// 				.find()
// 				.project({ name: 1, rarity: 1, role: 1 })
// 				.sort({
// 					rarity: -1,
// 					name: 1,
// 				})
// 				.toArray();

// 			//get all name translation keys from all artifacts
// 			let translationKeys = artifactList.reduce((keyArray, artifactObject) => {
// 				if (artifactObject && artifactObject.name) {
// 					keyArray.push(artifactObject.name);
// 				}
// 				return keyArray;
// 			}, []);

// 			let artifactTranslation = await translation.find({ _id: { $in: translationKeys } }).toArray();

// 			artifactList.map((artifact) => {
// 				const realKey = artifactTranslation.find((translationKey) => translationKey._id === artifact.name);
// 				artifact.name = (realKey && realKey.text) || artifact.name;
// 			});

// 			const TIME_END = process.hrtime(TIME_START);
// 			console.info('Execution time (hr): %ds %dms', TIME_END[0], TIME_END[1] / 1000000);
// 			return mountApiResponse({}, res, null, artifactList);
// 		} catch (error) {
// 			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
// 		}
// 	})
// );

router.get(
	'/artifact/:_id',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const TIME_START = nodeTimer();
		const { _id } = req.params;

		try {
			const requestedLanguage = getCurrentLanguage(req);
			const translationCollection = `text_${requestedLanguage}`;
			const collection = Database.getCollection('artifact', 2);

			if (!collection || !translationCollection || !_id) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			const artifactDetail = await collection
				.aggregate([
					{ $match: { _id } },
					{ $limit: 1 },
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
					{
						$lookup: {
							from: translationCollection,
							localField: 'description',
							foreignField: '_id',
							as: 'description',
						},
					},
					{
						$unwind: '$description',
					},
					{
						$addFields: {
							description: '$description.text',
						},
					},
					{
						$lookup: {
							from: translationCollection,
							localField: 'skill.description',
							foreignField: '_id',
							as: 'skill.description',
						},
					},
					{
						$unwind: '$skill.description',
					},
					{
						$addFields: {
							skill: { description: '$skill.description.text' },
						},
					},
				])
				.toArray();

			if (artifactDetail && artifactDetail.length) {
				nodeTimer(TIME_START);
				return mountApiResponse({}, res, null, artifactDetail);
			}
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		} catch (error) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}
	})
);

router.get(
	'/artifact',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const TIME_START = process.hrtime();

		try {
			const requestedLanguage = getCurrentLanguage(req);
			const translationCollection = `text_${requestedLanguage}`;
			const collection = Database.getCollection('artifact', 2);

			if (!collection || !translationCollection) {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}

			const artifactList = await collection
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
				.toArray();

			if (artifactList && artifactList.length) {
				nodeTimer(TIME_START);
				return mountApiResponse({}, res, null, artifactList);
			}
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		} catch (error) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}
	})
);

export default router;
