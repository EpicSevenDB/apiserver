import express from 'express';
import Database from './Database';

import { asyncRoute, mountApiErrorResponse, mountApiResponse } from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

// const router = RouterExperiments;
const router = express.Router();

//* ------------------------
// Artifacts
//------------------------ */
router.get(
	'/artifact/:fileId',
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('artifact'),
			{ fileId } = req.params;

		if (!collection || !fileId) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		let queryCursor = await collection.find({
			fileId,
		});

		return queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);
router.get(
	'/artifact',
	// `:variable`, `:optionalvariable?`
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('artifact');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}

		let queryCursor;

		// https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/
		queryCursor = await collection
			.find()
			.project({ loreDescription: 0, skillDescription: 0, stats: 0, _id: 0 })
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
				rarity: -1,
			});

		return queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);

export default router;
