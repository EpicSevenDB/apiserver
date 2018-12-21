import express from 'express';
import Database from './Database';

import { asyncRoute, isSupportedChallenge, mountApiErrorResponse, mountApiResponse } from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

// const router = RouterExperiments;
const router = express.Router();

//* ------------------------
// Main 'n' Only API Route
//------------------------ */
// Supports two kinds of GET
// /resource/{results}/{norandom}
// /resource?results={results}&nr={norandom}
//
// {results} must be a value parseInt'able or will throw 500
// {nr} norandom, optional flag
// 		flag must be 1 if you desire to receive same order of user in results
//
// Examples:
// /resource/10
// /resource/10/1
// /resource?results=10
// /resource?results=10&nr=1
router.get(
	'/:challenge/resource/:results?/:nr?',
	asyncRoute(async (req, res, next) => {
		const challengeName = req.params.challenge;

		//die if challenge not supported
		if (!isSupportedChallenge(challengeName)) {
			return mountApiErrorResponse(res);
		}
		const challengeCollection = Database.getCollection(challengeName);

		if (!challengeCollection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}
		const noRandom = req.params.nr === '1' || req.query.nr === '1' ? true : false;
		const resultsQuantity = parseInt(req.params.results || req.query.results || 1, 10);

		//making sure resultsQuantity is a number
		if (isNaN(resultsQuantity)) {
			return mountApiErrorResponse(res);
		}

		// not waste resources sending more than 50, no need for the challenge
		if (resultsQuantity > 50) {
			resultsQuantity = 50;
		}

		let queryCursor;

		if (!noRandom) {
			queryCursor = await challengeCollection.aggregate([
				{
					$sample: {
						size: resultsQuantity,
					},
				},
			]);
		} else {
			queryCursor = await challengeCollection
				.find()
				.sort({
					_id: 1,
				})
				.limit(resultsQuantity);
		}

		return queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);

export default router;
