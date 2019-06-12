import express from 'express';
import rateLimit from 'express-rate-limit';
import timeout from 'connect-timeout';
import paths from './utils/Paths';
import Router from './components/Router';
import Server from './components/Server';
import Database from './components/Database';
import { asyncRoute, asyncErrorRoute, cLog, mountApiErrorResponse } from './utils/Utility';
import { MESSAGES, HEADERS, VERSION } from './utils/Constants';
import { URL } from 'url';

const server = new Server({
	Database,
});
const { app } = server;

let hbsSharedData = {
	VERSION,
	errorTitle: null,
	errorStack: null,
};

const serverShutdown = (exitCode = 1) => {
	return Database.client && Database.client.close
		? Database.client.close(true, () => process.exit(exitCode))
		: process.exit(exitCode);
};

//catch for unhandledRejection so we close db conn and kill server
//Unhandled Promise Rejections, mostly.
process.on('unhandledRejection', (error) => {
	cLog(
		'error',
		`| ==========================================
| unhandledRejection: Please fix me -> ${error.message})
Killing the DB Connection and Node Server`
	);
	serverShutdown();
});

process.on('SIGINT', () => {
	cLog('log', 'Shuting down the server gracefully');
	serverShutdown(0);
});

process.on('SIGTERM', () => {
	cLog('log', 'Kill it with fire');
	serverShutdown();
});

//* ------------------------
// API Routes
//------------------------ */

// anti-DDOS
// Limit to 50 requests per minute
// limit each IP to {max} requests per {windowMs}
const limiter = rateLimit({
	max: 300,
	windowMs: 60 * 1000, // 1 minute
	keyGenerator: (req /*, res */) => {
		let domain = 'no-referer';
		if (req.headers.referer) {
			// spelled wrong per the RFC
			try {
				let refererUrl = '';
				if (req.headers.referer.indexOf('http') === -1) {
					refererUrl = new URL('http://' + req.headers.referer); // this can throw if the header is invalid
				} else {
					refererUrl = new URL(req.headers.referer); // this can throw if the header is invalid
				}
				domain = refererUrl.hostname;
			} catch (err) {
				cLog('warn', `Error parsing referrer ${req.headers.referer} from IP ${req.ip}`, err);
			}
		}
		return `${domain}:${req.ip}`;
	},
	handler: function(req, res /*next*/) {
		return mountApiErrorResponse(res, MESSAGES.query.limitExceeded);
	},
	onLimitReached: function(req, res, options) {
		//log a console with IP
		cLog(
			'warn',
			`WARN: Too many requests to the API coming from IP ${req.ip}. If this message continues for this IP, might be a DDOS attack.`
		);
	},
});

app.use('/api', limiter);
app.use('/api', Router);

//* ------------------------
// Static Routes
//------------------------ */
app.use('/ui', express.static(`${paths.dist}/ui/`));

app.get(
	'/',
	timeout('5s'),
	asyncRoute(async (req, res) => {
		//this tells hbs view engine we want it to use views/layout as a layout
		//so the filename you pass in render actually renders layout and the file
		//contents is passed as 'body' var. We'll use {{{body}}} to render properly
		res.locals.layout = 'layout';
		return res.render('partials/home.hbs', Object.assign({}, hbsSharedData, {}));
	})
);

//* ------------------------
// Error Handlers
// (must come last before start)
//------------------------ */
//500
app.use(
	timeout('5s'),
	asyncErrorRoute(async (err, req, res, next) => {
		if (!next) res();
		return res
			.status(500)
			.set(HEADERS.html)
			.render(
				'partials/error.hbs',
				Object.assign({}, hbsSharedData, {
					errorTitle: MESSAGES.server.error.title,
					errorStack: err.stack,
				})
			);
	})
);

//404
app.use(
	timeout('5s'),
	asyncRoute(async (req, res) => {
		return res
			.status(404)
			.set(HEADERS.html)
			.render(
				'partials/error.hbs',
				Object.assign({}, hbsSharedData, {
					errorTitle: MESSAGES.server.notFound.title,
					errorStack: MESSAGES.server.notFound.message,
				})
			);
	})
);

// ------------------------
server.start();
