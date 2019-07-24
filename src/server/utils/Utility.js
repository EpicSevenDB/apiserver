import dateFormat from 'dateformat';
import { VERSION, MESSAGES, HEADERS } from './Constants';

//* ------------------------
// Section: Routes Related
//------------------------ */
export const asyncRoute = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

export const asyncErrorRoute = (fn) => (err, req, res, next) => {
	Promise.resolve(fn(err, req, res, next)).catch(next);
};

export const mountApiErrorResponse = (res, error = MESSAGES.query.invalid, stack = '') => {
	return res
		.status(418) //Just a joke :) See https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418
		.set(HEADERS.json)
		.json({
			error,
			stack,
			meta: getResponseMeta(),
		});
};

export const mountApiResponse = (queryCursor, res, err, dbResults = []) => {
	if (queryCursor && queryCursor.close) {
		queryCursor.close();
	}

	if (err) {
		return mountApiErrorResponse(res, MESSAGES.db.dbConnectionQuery, err);
	}

	return res
		.status(200)
		.set(HEADERS.json)
		.json({
			results: dbResults,
			meta: getResponseMeta(),
		});
};

//* ------------------------
// Section: Database Related
//------------------------ */

//* ------------------------
// Section:General Utility Related
//------------------------ */
export const getDateNow = () => {
	return dateFormat(new Date(), 'ddd mmm dd HH:MM:ss Z yyyy', true);
};

export const getResponseMeta = () => {
	return {
		requestDate: getDateNow(),
		apiVersion: VERSION,
	};
};

export const cLog = (logLevel = 'log', ...messages) => {
	return console[logLevel](MESSAGES.apiLoggerPrefix, ...messages); // eslint-disable-line no-console
};

export function haltOnTimedout(req, res, next) {
	if (!req.timedout) next();
}
// https://stackoverflow.com/a/12646864
export function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
