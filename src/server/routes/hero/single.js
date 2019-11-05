import Database from '../../components/Database';
import { MESSAGES } from '../../utils/Constants';
import {
	mountApiErrorResponse,
	mountApiResponse,
	getCurrentLanguage,
	nodeTimer,
	asyncRoute,
} from '../../utils/Utility';

export default asyncRoute(async (req, res, next) => {
	const TIME_START = nodeTimer();
	const { _id } = req.params;

	try {
		const requestedLanguage = getCurrentLanguage(req);
		const translationCollection = `text_${requestedLanguage}`;
		const collection = Database.getCollection('hero', 2);

		if (!collection || !translationCollection || !_id) {
			return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
		}

		const heroDetail = await collection
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
						localField: 'story',
						foreignField: '_id',
						as: 'story',
					},
				},
				{
					$unwind: '$story',
				},
				{
					$addFields: {
						story: '$story.text',
					},
				},
				{
					$lookup: {
						from: translationCollection,
						localField: 'get_line',
						foreignField: '_id',
						as: 'get_line',
					},
				},
				{
					$unwind: '$get_line',
				},
				{
					$addFields: {
						get_line: '$get_line.text',
					},
				},
				{
					$lookup: {
						from: translationCollection,
						localField: 'specialty.name',
						foreignField: '_id',
						as: 'specialty.name',
					},
				},
				{
					$unwind: '$specialty.name',
				},
				{
					$addFields: {
						specialty: { name: '$specialty.name.text' },
					},
				},
				{
					$lookup: {
						from: translationCollection,
						localField: 'specialty.description',
						foreignField: '_id',
						as: 'specialty.description',
					},
				},
				{
					$unwind: '$specialty.description',
				},
				{
					$addFields: {
						specialty: { description: '$specialty.description.text' },
					},
				},
				{
					$lookup: {
						from: translationCollection,
						localField: 'specialty.type.name',
						foreignField: '_id',
						as: 'specialty.type.name',
					},
				},
				{
					$unwind: '$specialty.type.name',
				},
				{
					$addFields: {
						specialty: { type: { name: '$specialty.type.name.text' } },
					},
				},
				{
					$lookup: {
						from: translationCollection,
						localField: 'specialty.type.description',
						foreignField: '_id',
						as: 'specialty.type.description',
					},
				},
				{
					$unwind: '$specialty.type.description',
				},
				{
					$addFields: {
						specialty: { type: { description: '$specialty.type.description.text' } },
					},
				},

				{
					$lookup: {
						from: translationCollection,
						let: { pid: '$camping.topics' },
						pipeline: [
							{ $match: { $expr: { $in: ['$_id', '$$pid'] } } },
							// Add additional stages here
						],
						as: 'camping.topics',
					},
				},
				{
					$addFields: {
						camping: { topics: '$camping.topics.text' },
					},
				},
				{
					$lookup: {
						from: translationCollection,
						let: { pid: '$camping.personalities' },
						pipeline: [
							{ $match: { $expr: { $in: ['$_id', '$$pid'] } } },
							// Add additional stages here
						],
						as: 'camping.personalities',
					},
				},
				{
					$addFields: {
						camping: { personalities: '$camping.personalities.text' },
					},
				},
				{
					$lookup: {
						from: translationCollection,
						let: { pid: '$camping.values' },
						pipeline: [
							{ $match: { $expr: { $in: ['$_id', '$$pid'] } } },
							// Add additional stages here
						],
						as: 'camping.personalities',
					},
				},
				{
					$addFields: {
						camping: { personalities: '$camping.personalities.text' },
					},
				},
			])
			.toArray();

		if (heroDetail && heroDetail.length) {
			nodeTimer(TIME_START);
			return mountApiResponse({}, res, null, heroDetail);
		}
		return mountApiErrorResponse(res, MESSAGES.query.invalid);
	} catch (error) {
		return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery);
	}
});
