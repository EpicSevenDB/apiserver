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
export const getCurrentLanguage = (req) => {
	let { lang: requestedLanguage = req.get('x-e7db-lang') } = req.query;
	if (!['en', 'es', 'pt'].includes(requestedLanguage)) {
		return requestedLanguage;
	}
	return 'en';
};

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
// https://gist.github.com/nikolas/96586a0b56f53eabfd6fe4ed59fecb98
export function shuffleArray(array) {
	const a = array.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
