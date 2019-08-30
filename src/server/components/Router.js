import express from 'express';
import timeout from 'connect-timeout';
import Database from './Database';
import { asyncRoute, mountApiErrorResponse, mountApiResponse, shuffleArray } from '../utils/Utility';
import { MESSAGES } from '../utils/Constants';

const router = express.Router();

//* ------------------------
// Latest
//------------------------ */
router.get(
	'/latest',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('latest');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		}

		let queryCursor = collection.aggregate([
			{
				$lookup: {
					from: 'hero',
					let: { letId: '$hero' },
					pipeline: [
						{ $match: { $expr: { $in: ['$_id', '$$letId'] } } },
						{
							$project: {
								_id: 1,
								fileId: 1,
								name: 1,
								rarity: 1,
								element: 1,
								classType: 1,
								zodiac: 1,
							},
						},
					],
					as: 'hero',
				},
			},
			{
				$lookup: {
					from: 'artifact',
					let: { letId: '$artifact' },
					pipeline: [
						{ $match: { $expr: { $in: ['$_id', '$$letId'] } } },
						{
							$project: { loreDescription: 0, skillDescription: 0, stats: 0 },
						},
					],
					as: 'artifact',
				},
			},
		]);

		return await queryCursor
			.toArray()
			.then((latestStuff) => {
				if (latestStuff && latestStuff[0]) {
					return mountApiResponse({}, res, null, [latestStuff[0]]);
				} else {
					return new Promise.reject();
				}
			})
			.catch(() => {
				return mountApiErrorResponse(res, MESSAGES.query.invalid);
			});
	})
);

//* ------------------------
// Items
//------------------------ */
router.get(
	'/item/:fileId',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('item'),
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
	'/item',
	timeout('15s'),
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
			// https://docs.mongodb.com/manual/reference/method/cursor.sort/index.html#sort-asc-desc
			.sort({
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
	timeout('15s'),
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
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('artifact');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		// req.params.results resource/{number}
		// req.query.results resource?results={number}

		let queryCursor = collection
			.find()
			.project({ loreDescription: 0, skillDescription: 0, stats: 0 })
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
	'/hero/:_id',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('hero'),
			{ _id } = req.params;

		if (!collection || !_id) {
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		}

		let queryCursor = collection.aggregate([
			{ $match: { _id } },
			//     // populate relations BROKEN!!
			// 	{
			// 		$lookup: {
			// 			from: 'hero',
			// 			let: { letId: '$relations.hero' },
			// 			// localField: "relations.hero", //this would bring entire hero data, which is unnecesary
			// 			// foreignField: "_id",  //this would bring entire hero data, which is unnecesary
			// 			pipeline: [
			// 				//match each $relations.hero (as "$$letId") in collection hero's (as "from") $_id
			//                 { $match: { $expr: { $in: ['$_id', '$$letId'] } } },
			//                 { $project: { name: 1, fileId: 1, _id: 1 } },
			//                 // {$sort:{name:1}},
			// 			],
			// 			as: 'relations',
			// 		},
			//     },

			// SPECIALTY CHANGE NAME
			//populate specialtyChangeName
			{
				$lookup: {
					from: 'hero',
					let: { letId: ['$specialtyChangeName'] }, //fake letId into array
					// localField: "relations.hero",
					// foreignField: "_id",
					pipeline: [
						{ $match: { $expr: { $in: ['$_id', '$$letId'] } } },
						{ $project: { name: 1, fileId: 1, _id: 1 } },
					],
					as: 'specialtyChangeName',
				},
			},
			//make specialtyChangeName from array into object with the projected data
			{
				$unwind: {
					path: '$specialtyChangeName',
					//just don't unwind if doesn't exist, if false, it'll not return a hero document
					preserveNullAndEmptyArrays: true,
				},
			},

			// VOICE ARRAY
			{
				$lookup: {
					from: 'voice',
					localField: '_id',
					foreignField: '_id',
					as: 'voice',
				},
			},
			{
				$addFields: {
					voiceList: '$voice.voice',
				},
			},
			{
				$unwind: {
					path: '$voiceList',
					//just don't unwind if doesn't exist, if false, it'll not return a hero document
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$project: {
					voice: 0,
				},
			},
		]);

		// return await queryCursor.toArray((...args) => mountApiResponse(queryCursor, res, ...args));

		//LE OLD WAY, 3 calls, but faster... lol
		//get hero
		// let queryCursor = collection.find({ _id }).limit(1);

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
						.project({ name: 1, fileId: 1, _id: 1 });

					return await queryCursorForRelationship.toArray().then(async (relationHeroes) => {
						if (relationHeroes && relationHeroes.length) {
							let newRelationArray = currentHero.relations.map((hero) => {
								let currSome = 0;
								if (
									relationHeroes.some((e, i) => {
										currSome = i;
										return e.fileId === hero.hero || e._id === hero.hero;
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

						//SPECIALTY CHANGE TAKEN CARE OF IN AGGREGATE ABOVE

						//no specialty, end
						// if (!currentHero.specialtyChangeName) {
						return mountApiResponse({}, res, null, [currentHero]);
						// // }

						// let queryCursorForSpecialty = collection
						// 	.find({ fileId: currentHero.specialtyChangeName })
						// 	.project({ _id: 1, name: 1 })
						// 	.limit(1);

						// return await queryCursorForSpecialty.toArray().then((specialtyHeros) => {
						// 	if (!specialtyHeros || !specialtyHeros.length) {
						// 		return mountApiResponse({}, res, null, [currentHero]);
						// 	}
						// 	currentHero.specialtyChangeName = {
						// 		_id: specialtyHeros[0]._id,
						// 		fileId: currentHero.specialtyChangeName,
						// 		name: specialtyHeros[0].name,
						// 	};
						// 	return mountApiResponse({}, res, null, [currentHero]);
						// });
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
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('hero');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		let queryCursorForHeroList = collection
			.aggregate([
				{
					$project: {
						_id: 1,
						fileId: 1,
						name: 1,
						rarity: 1,
						element: 1,
						classType: 1,
						zodiac: 1,
						skills: 1,
						memoryImprintAttribute: 1,
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

//* ------------------------
// Creators
//------------------------ */
router.get(
	'/creator',
	timeout('15s'),
	asyncRoute(async (req, res, next) => {
		const collection = Database.getCollection('creator');

		if (!collection) {
			return mountApiErrorResponse(res, MESSAGES.query.invalid);
		}

		let queryCursor = collection.find();

		return await queryCursor
			.toArray()
			.then((creatorList = []) => {
				if (creatorList.length) {
					//random creator order each call
					return mountApiResponse({}, res, null, shuffleArray(creatorList));
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
