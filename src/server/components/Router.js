import express from 'express';
import Database from './Database';
import { asyncRoute, mountApiErrorResponse, mountApiResponse } from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

const router = express.Router();

//* ------------------------
// Items
//------------------------ */
router.get(
	'/item',
	// `:variable`, `:optionalvariable?`
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('item');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}

		let queryCursor = collection
			.find()
			// .project({ loreDescription: 0, skillDescription: 0, stats: 0, _id: 0 })
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
				type: 1,
				name: 1,
			});

		return await queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
	})
);

//* ------------------------
// Artifacts
//------------------------ */
router.get(
	'/artifact/:fileId',
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('artifact'),
			{ fileId } = req.params;

		if (!collection || !fileId) {
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		}

		let queryCursor = collection
			.find({
				fileId,
			})
			.limit(1);

		return await queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
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

		let queryCursor = collection
			.find()
			.project({ loreDescription: 0, skillDescription: 0, stats: 0, _id: 0 })
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
				rarity: -1,
				name: 1,
			});

		return await queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));
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
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
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
		let queryCursor = collection
			.find({ fileId })
			.project({ _id: 0 })
			.limit(1);

		return await queryCursor
			.toArray()
			.then(async (currentHero) => {
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

					return await queryCursorForRelationship.toArray().then(async (relationHeroes) => {
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
								if (e && e.name) {
									//already have the name and fileId
									delete e.hero;
								}
								return e !== undefined;
							});
						} else {
							//clean relations as we have zero heroes on relations
							currentHero.relations = [];
						}

						//no specialty, end
						if (!currentHero.specialtyChangeName) {
							return mountApiResponse({}, res, null, [currentHero]);
						}

						let queryCursorForSpecialty = collection
							.find({ fileId: currentHero.specialtyChangeName })
							.project({ _id: 0, name: 1 })
							.limit(1);

						return await queryCursorForSpecialty.toArray().then((specialtyHeros) => {
							if (!specialtyHeros || !specialtyHeros.length) {
								return mountApiResponse({}, res, null, [currentHero]);
							}
							currentHero.specialtyChangeName = {
								fileId: currentHero.specialtyChangeName,
								name: specialtyHeros[0].name,
							};
							return mountApiResponse({}, res, null, [currentHero]);
						});
					});
				} else {
					return new Promise.reject();
				}
			})
			.catch(() => {
				return mountApiErrorResponse(res, MESSAGES.query.invalid);
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

		let queryCursorForHeroList = collection
			.aggregate([
				{
					$project: {
						_id: 0,
						fileId: 1,
						name: 1,
						rarity: 1,
						element: 1,
						classType: 1,
						zodiac: 1,
						skills: 1,
					},
				},
				{
					$addFields: {
						buffs: {
							$map: {
								input: '$skills.buffs',
								as: 'el',
								in: '$$el',
							},
						},
						debuffs: {
							$map: {
								input: '$skills.debuffs',
								as: 'el',
								in: '$$el',
							},
						},
					},
				},
				{
					$project: {
						skills: 0,
					},
				},

				// {
				//     $reduce: {
				//         input: '$$buffs',
				//         initialValue: [],
				//         in: { $concatArrays: ['$$value', '$$this'] },
				//     },
				// },
			])
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
				rarity: -1,
				name: 1,
			});

		return await queryCursorForHeroList
			.toArray()
			.then((heroList = []) => {
				if (heroList.length) {
					heroList.forEach((hero) => {
						hero.buffs = [].concat(...hero.buffs);
						hero.debuffs = [].concat(...hero.debuffs);
					});
					return mountApiResponse({}, res, null, heroList);
				} else {
					return new Promise.reject();
				}
			})
			.catch(() => {
				return mountApiErrorResponse(res, MESSAGES.query.invalid);
			});
	})
);

export default router;
