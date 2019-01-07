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

		let queryCursor = await collection
			.find({
				fileId,
			})
			.limit(1);

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

//* ------------------------
// Heroes
//------------------------ */
router.get(
	'/hero/:fileId',
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('hero'),
			{ fileId } = req.params;

		if (!collection || !fileId) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// let queryCursor = await collection
		// 	.aggregate([
		// 		{ $match: { fileId } },
		// 		{
		// 			$lookup: {
		// 				from: 'hero',
		// 				as: 'relationsFull',
		// 				localField: 'relations.hero',
		// 				foreignField: 'fileId',
		// 			},
		// 		},
		// 	]);

		//get hero
		let queryCursor = await collection
			.find({
				fileId,
			})
			.project({ _id: 0 })
			.limit(1);

		await queryCursor.toArray().then((currentHero) => {
			if (currentHero && currentHero[0]) {
				currentHero = currentHero[0];
				let relations = [];
				currentHero.relations.forEach((relation) => {
					relations.push(relation.hero);
				});

				//get data of all heroes on relation
				let queryCursorForRelationship = collection
					.find({ fileId: { $in: [...relations] } })
					.project({ name: 1, fileId: 1, _id: 0 });

				return queryCursorForRelationship.toArray().then((relationHeroes) => {
					if (relationHeroes && relationHeroes.length) {
						let newRelationArray = currentHero.relations.map((hero) => {
							let currSome = 0;
							if (
								relationHeroes.some((e, i) => {
									currSome = i;
									return e.fileId === hero.hero;
								})
							) {
								return { ...hero, ...relationHeroes[currSome] };
							}
						});
						//clean the array entries of heroes I don't have data on
						currentHero.relations = newRelationArray.filter((e) => {
							if (e) {
								//already have the name and fileId
								delete e.hero;
							}
							return e !== undefined;
						});
					}
					return mountApiResponse({}, res, null, [currentHero]);
				});
			} else {
				return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
			}
		});
	})
);
router.get(
	'/hero',
	// `:variable`, `:optionalvariable?`
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('hero');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}

		let queryCursor;

		// https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/
		queryCursor = await collection
			.find()
			.project({ _id: 0, name: 1, rarity: 1, element: 1, classType: 1, fileId: 1 })
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
				rarity: -1,
			});

		return queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);

export default router;
