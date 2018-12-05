import express from 'express';
import Database from './Database';

import {
	asyncRoute,
	mountApiErrorResponse,
	mountApiResponse,
} from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

// const router = RouterExperiments;
const router = express.Router();

//* ------------------------
// Example
//------------------------ */
router.get(
    '/heroes/list',
    // `:variable`, `:optionalvariable?`
	asyncRoute(async (req, res, next) => {
		const heroesCollection = Database.getCollection('heroes');

        if (!heroesCollection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}

        let queryCursor;

        // queryCursor = await heroesCollection.somemongomethod

		return queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);

export default router;
